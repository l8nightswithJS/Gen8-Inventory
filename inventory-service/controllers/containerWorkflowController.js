const pool = require('../db/pool');
const {
  getPositiveBalances,
  getStagingLocation,
  movementActor,
  recordMovement,
  resolveSourceBalance,
} = require('./_movementLedger');

const QUALITY_STATUSES = new Set([
  'pending_inspection',
  'released',
  'hold',
  'quarantine',
  'rejected',
]);

function parseQuantity(value, label) {
  const normalized = String(value ?? '').trim().replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
    const error = new Error(`${label} must be a non-negative number with up to 3 decimals.`);
    error.status = 400;
    throw error;
  }
  const number = Number(normalized);
  if (!Number.isFinite(number) || number <= 0) {
    const error = new Error(`${label} must be greater than zero.`);
    error.status = 400;
    throw error;
  }
  return number;
}

async function lockContainer(db, id) {
  const result = await db.query(
    `SELECT * FROM items WHERE id = $1 FOR UPDATE`,
    [id],
  );
  if (!result.rows[0] || result.rows[0].archived_at) {
    const error = new Error('Inventory container not found.');
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

exports.setQualityStatus = async (req, res, next) => {
  const itemId = Number(req.params?.id);
  const qualityStatus = String(req.body?.quality_status || '').trim().toLowerCase();
  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'Invalid container id.' });
  }
  if (!QUALITY_STATUSES.has(qualityStatus)) {
    return res.status(400).json({ message: 'Invalid quality_status.' });
  }

  let db;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const item = await lockContainer(db, itemId);
    const previous = item.quality_status || 'released';
    const notes = String(req.body?.notes || '').trim() || null;

    await db.query(
      `UPDATE items
       SET quality_status = $2, quality_updated_at = now(), quality_notes = $3,
           last_updated = now()
       WHERE id = $1`,
      [itemId, qualityStatus, notes],
    );

    if (previous !== qualityStatus) {
      await recordMovement(db, {
        itemId,
        movementType: 'quality_status_change',
        quantity: 0,
        uom: item.uom,
        reason: notes || `Quality status changed from ${previous} to ${qualityStatus}`,
        metadata: { from_quality_status: previous, to_quality_status: qualityStatus },
        ...movementActor(req.user),
      });
    }

    await db.query('COMMIT');
    return res.json({
      message: `Container quality status is now ${qualityStatus}.`,
      item_id: itemId,
      previous_quality_status: previous,
      quality_status: qualityStatus,
      quality_notes: notes,
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => undefined);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  } finally {
    db?.release();
  }
};

exports.repackContainer = async (req, res, next) => {
  const itemId = Number(req.params?.id);
  const requestedSourceLocationId = Number(req.body?.source_location_id);
  const requestedChildren = Array.isArray(req.body?.containers) ? req.body.containers : [];
  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'Invalid source container id.' });
  }
  if (!requestedChildren.length) {
    return res.status(400).json({ message: 'At least one new physical container is required.' });
  }

  let db;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const sourceItem = await lockContainer(db, itemId);
    if (sourceItem.review_status === 'needs_review') {
      const error = new Error('Resolve this container before splitting or repacking it.');
      error.status = 409;
      throw error;
    }

    const source = await resolveSourceBalance(
      db,
      itemId,
      Number.isSafeInteger(requestedSourceLocationId) && requestedSourceLocationId > 0
        ? requestedSourceLocationId
        : null,
    );
    const staging = await getStagingLocation(db);
    const children = requestedChildren.map((child, index) => ({
      quantity: parseQuantity(child?.quantity, `Container ${index + 1} quantity`),
      package_type: String(child?.package_type || sourceItem.package_type || '').trim() || null,
      vendor_barcode: String(child?.vendor_barcode || '').trim() || null,
    }));
    const total = Math.round(children.reduce((sum, child) => sum + child.quantity, 0) * 1000) / 1000;
    if (total > source.quantity + 0.0005) {
      const error = new Error(
        `Cannot repack ${total} ${sourceItem.uom || ''}; only ${source.quantity} is available in ${source.code}.`,
      );
      error.status = 409;
      throw error;
    }

    const sourceAfter = Math.round((source.quantity - total) * 1000) / 1000;
    if (sourceAfter <= 0.0005) {
      await db.query(
        `DELETE FROM inventory WHERE item_id = $1 AND location_id = $2`,
        [itemId, source.location_id],
      );
      await db.query(
        `UPDATE items
         SET container_status = 'empty', emptied_at = now(), last_updated = now()
         WHERE id = $1`,
        [itemId],
      );
    } else {
      await db.query(
        `UPDATE inventory SET quantity = $3, updated_at = now()
         WHERE item_id = $1 AND location_id = $2`,
        [itemId, source.location_id, sourceAfter],
      );
      await db.query(
        `UPDATE items SET last_updated = now() WHERE id = $1`,
        [itemId],
      );
    }

    const actor = movementActor(req.user);
    const created = [];
    for (const child of children) {
      const result = await db.query(
        `INSERT INTO items (
           client_id, product_id, source_container_id, part_number, lot_number,
           name, description, vendor_barcode, uom, initial_quantity, attributes,
           review_status, review_issues, container_status, quality_status,
           quality_updated_at, quality_notes, package_type
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,
           'clear','[]'::jsonb,'available',$12,now(),$13,$14
         )
         RETURNING id, barcode, part_number, lot_number, name, uom,
                   initial_quantity, quality_status, package_type`,
        [
          sourceItem.client_id,
          sourceItem.product_id,
          sourceItem.id,
          sourceItem.part_number,
          sourceItem.lot_number,
          sourceItem.name,
          sourceItem.description,
          child.vendor_barcode,
          sourceItem.uom,
          child.quantity,
          JSON.stringify(sourceItem.attributes || {}),
          sourceItem.quality_status || 'released',
          sourceItem.quality_notes,
          child.package_type,
        ],
      );
      const newItem = result.rows[0];
      await db.query(
        `INSERT INTO inventory (item_id, location_id, quantity) VALUES ($1,$2,$3)`,
        [newItem.id, staging.id, child.quantity],
      );
      await recordMovement(db, {
        itemId: newItem.id,
        movementType: 'repack_in',
        toLocationId: staging.id,
        quantity: child.quantity,
        destinationBefore: 0,
        destinationAfter: child.quantity,
        uom: sourceItem.uom,
        reason: `Created from ${sourceItem.barcode} during split/repack`,
        metadata: { source_container_id: sourceItem.id, source_container_barcode: sourceItem.barcode },
        ...actor,
      });
      created.push({ ...newItem, location: staging.code });
    }

    await recordMovement(db, {
      itemId: sourceItem.id,
      movementType: 'repack_out',
      fromLocationId: source.location_id,
      quantity: total,
      sourceBefore: source.quantity,
      sourceAfter,
      uom: sourceItem.uom,
      reason: `Split/repacked into ${created.length} new physical container(s)`,
      metadata: {
        child_item_ids: created.map((item) => item.id),
        child_barcodes: created.map((item) => item.barcode),
      },
      ...actor,
    });

    await db.query('COMMIT');
    return res.status(201).json({
      message: `${created.length} new G8I container(s) created in STAGING.`,
      source: {
        id: sourceItem.id,
        barcode: sourceItem.barcode,
        previous_quantity: source.quantity,
        remaining_quantity: sourceAfter,
        location: source.code,
      },
      containers: created,
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => undefined);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  } finally {
    db?.release();
  }
};

exports.getTraceability = async (req, res, next) => {
  const itemId = Number(req.params?.id);
  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'Invalid container id.' });
  }
  try {
    const [itemResult, childResult] = await Promise.all([
      pool.query(
        `SELECT item.id, item.barcode, item.part_number, item.lot_number,
                item.source_container_id, parent.barcode AS source_container_barcode,
                item.receipt_line_id, receipt.receipt_number
         FROM items AS item
         LEFT JOIN items AS parent ON parent.id = item.source_container_id
         LEFT JOIN receipt_lines AS receipt_line ON receipt_line.id = item.receipt_line_id
         LEFT JOIN receipts AS receipt ON receipt.id = receipt_line.receipt_id
         WHERE item.id = $1`,
        [itemId],
      ),
      pool.query(
        `SELECT id, barcode, part_number, lot_number, initial_quantity, uom,
                container_status, quality_status, archived_at
         FROM items
         WHERE source_container_id = $1
         ORDER BY id`,
        [itemId],
      ),
    ]);
    if (!itemResult.rows[0]) return res.status(404).json({ message: 'Container not found.' });
    return res.json({ ...itemResult.rows[0], child_containers: childResult.rows });
  } catch (error) {
    return next(error);
  }
};

module.exports._test = { parseQuantity };
