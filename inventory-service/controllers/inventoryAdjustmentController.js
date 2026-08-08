const pool = require('../db/pool');
const { movementActor, recordMovement } = require('./_movementLedger');

function normalizeDecimalText(value) {
  const text = String(value ?? '').trim();
  return /^-?\d{1,3}(?:,\d{3})+(?:\.\d{1,3})?$/.test(text)
    ? text.replace(/,/g, '')
    : text;
}

function parseNonNegativeQuantity(value, field) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${field} is required.`);
  }
  const normalized = normalizeDecimalText(value);
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
    throw new Error(
      `${field} must be a non-negative number with no more than 3 decimal places.`,
    );
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed > 99999999999.999) {
    throw new Error(`${field} is outside the supported range.`);
  }
  return parsed;
}

function parseSignedQuantity(value, field) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${field} is required.`);
  }
  const normalized = normalizeDecimalText(value);
  if (!/^-?\d+(?:\.\d{1,3})?$/.test(normalized)) {
    throw new Error(`${field} must be a number with no more than 3 decimal places.`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > 99999999999.999) {
    throw new Error(`${field} is outside the supported range.`);
  }
  return parsed;
}

function normalizeUom(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('uom must be text.');
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.length > 40) throw new Error('uom must be 40 characters or fewer.');
  return normalized;
}

exports.adjustInventory = async (req, res, next) => {
  const itemId = Number(req.body?.item_id);
  const locationId = Number(req.body?.location_id);
  let changeQuantity;

  try {
    changeQuantity = parseSignedQuantity(req.body?.change_quantity, 'change_quantity');
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'item_id must be a positive integer.' });
  }
  if (!Number.isSafeInteger(locationId) || locationId < 1) {
    return res.status(400).json({ message: 'location_id must be a positive integer.' });
  }
  if (changeQuantity === 0) {
    return res.status(400).json({ message: 'change_quantity must not be zero.' });
  }

  let db = null;
  try {
    db = await pool.connect();
    await db.query('BEGIN');

    const itemResult = await db.query(
      `SELECT id, review_status, uom, archived_at
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [itemId],
    );
    const item = itemResult.rows[0];
    if (!item || item.archived_at) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory container not found.' });
    }
    if (item.review_status === 'needs_review') {
      await db.query('ROLLBACK');
      return res.status(409).json({
        code: 'ITEM_NEEDS_REVIEW',
        message: 'Resolve this container before adjusting stock.',
      });
    }

    const beforeResult = await db.query(
      `SELECT quantity::numeric AS quantity
       FROM inventory
       WHERE item_id = $1 AND location_id = $2
       FOR UPDATE`,
      [itemId, locationId],
    );
    const before = Number(beforeResult.rows[0]?.quantity || 0);
    const after = before + changeQuantity;
    if (after < 0) {
      await db.query('ROLLBACK');
      return res.status(409).json({ message: 'Update failed: quantity cannot be negative.' });
    }

    if (after === 0) {
      await db.query(
        'DELETE FROM inventory WHERE item_id = $1 AND location_id = $2',
        [itemId, locationId],
      );
    } else {
      await db.query(
        `INSERT INTO inventory (item_id, location_id, quantity)
         VALUES ($1,$2,$3)
         ON CONFLICT (item_id, location_id)
         DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
        [itemId, locationId, after],
      );
    }

    await recordMovement(db, {
      itemId,
      movementType: 'adjustment',
      fromLocationId: locationId,
      toLocationId: locationId,
      quantity: Math.abs(changeQuantity),
      sourceBefore: before,
      sourceAfter: after,
      destinationBefore: before,
      destinationAfter: after,
      uom: item.uom,
      reason: 'Manual inventory adjustment',
      metadata: { signed_change: changeQuantity },
      ...movementActor(req.user),
    });

    await db.query('COMMIT');
    return res.json({ message: 'Inventory updated successfully', new_quantity: after });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => undefined);
    if (error.code === '23503') {
      return res.status(400).json({ message: 'The selected item or location does not exist.' });
    }
    return next(error);
  } finally {
    db?.release();
  }
};

exports.resolveReview = async (req, res, next) => {
  const itemId = Number(req.params.id);
  const allocations = req.body?.allocations;
  let uom;

  try {
    if (!Number.isSafeInteger(itemId) || itemId < 1) throw new Error('Invalid item id.');
    if (!Array.isArray(allocations) || allocations.length === 0) {
      throw new Error('At least one location allocation is required.');
    }
    uom = normalizeUom(req.body?.uom);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const normalizedAllocations = [];
  const seenLocations = new Set();
  try {
    for (let index = 0; index < allocations.length; index += 1) {
      const allocation = allocations[index] || {};
      const locationId = Number(allocation.location_id);
      if (!Number.isSafeInteger(locationId) || locationId < 1) {
        throw new Error(`Allocation ${index + 1}: location_id must be a positive integer.`);
      }
      if (seenLocations.has(locationId)) {
        throw new Error(`Allocation ${index + 1}: each location may appear only once.`);
      }
      seenLocations.add(locationId);
      normalizedAllocations.push({
        locationId,
        quantity: parseNonNegativeQuantity(
          allocation.quantity,
          `Allocation ${index + 1} quantity`,
        ),
      });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  let db = null;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const itemResult = await db.query(
      `SELECT id, review_status, uom, initial_quantity
       FROM items
       WHERE id = $1 AND archived_at IS NULL
       FOR UPDATE`,
      [itemId],
    );
    const item = itemResult.rows[0];
    if (!item) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory container not found.' });
    }
    if (item.review_status !== 'needs_review') {
      await db.query('ROLLBACK');
      return res.status(409).json({
        code: 'ITEM_NOT_IN_REVIEW',
        message: 'This container no longer has unresolved inventory data.',
      });
    }

    await db.query('DELETE FROM inventory WHERE item_id = $1', [itemId]);
    const effectiveUom = uom || item.uom;
    const totalQuantity = normalizedAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity,
      0,
    );

    for (const allocation of normalizedAllocations) {
      if (allocation.quantity <= 0) continue;
      await db.query(
        `INSERT INTO inventory (item_id, location_id, quantity)
         VALUES ($1,$2,$3)`,
        [itemId, allocation.locationId, allocation.quantity],
      );
      await recordMovement(db, {
        itemId,
        movementType: 'review_resolution',
        toLocationId: allocation.locationId,
        quantity: allocation.quantity,
        destinationBefore: 0,
        destinationAfter: allocation.quantity,
        uom: effectiveUom,
        reason: 'Imported inventory review resolved',
        ...movementActor(req.user),
      });
    }

    const updateResult = await db.query(
      `UPDATE items
       SET
         uom = COALESCE($2, uom),
         initial_quantity = COALESCE(initial_quantity, $3),
         container_status = CASE WHEN $3 <= 0 THEN 'empty' ELSE 'available' END,
         emptied_at = CASE WHEN $3 <= 0 THEN NOW() ELSE NULL END,
         review_status = 'clear',
         review_issues = '[]'::jsonb,
         reviewed_at = NOW(),
         last_updated = NOW()
       WHERE id = $1
       RETURNING *`,
      [itemId, uom, totalQuantity],
    );

    await db.query('COMMIT');
    return res.json({
      message: 'Inventory review resolved successfully.',
      item: updateResult.rows[0],
      total_quantity: totalQuantity,
      allocations: normalizedAllocations.map((allocation) => ({
        location_id: allocation.locationId,
        quantity: allocation.quantity,
      })),
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => undefined);
    if (error.code === '23503') {
      return res.status(400).json({ message: 'One or more selected locations no longer exist.' });
    }
    return next(error);
  } finally {
    db?.release();
  }
};

module.exports._test = {
  normalizeUom,
  parseNonNegativeQuantity,
  parseSignedQuantity,
};
