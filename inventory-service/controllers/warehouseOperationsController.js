const pool = require('../db/pool');
const {
  movementActor,
  numeric,
  recordMovement,
  resolveSourceBalance,
} = require('./_movementLedger');

function parseQuantity(value, field, { allowZero = false } = {}) {
  const normalized = String(value ?? '').trim().replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
    const error = new Error(
      `${field} must be a non-negative number with up to 3 decimals.`,
    );
    error.status = 400;
    throw error;
  }
  const parsed = Number(normalized);
  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    (!allowZero && parsed === 0)
  ) {
    const error = new Error(
      `${field} must be ${allowZero ? 'non-negative' : 'greater than zero'}.`,
    );
    error.status = 400;
    throw error;
  }
  return parsed;
}

async function activeLocation(db, id) {
  const result = await db.query(
    `SELECT id, code, barcode, description, location_type
     FROM locations
     WHERE id = $1 AND active = true
     LIMIT 1`,
    [id],
  );
  if (!result.rows[0]) {
    const error = new Error(
      'The destination location does not exist or is inactive.',
    );
    error.status = 400;
    throw error;
  }
  return result.rows[0];
}

async function lockItem(db, itemId) {
  const result = await db.query(
    `SELECT id, client_id, part_number, lot_number, name, description,
            barcode, uom, review_status, container_status, quality_status,
            archived_at
     FROM items
     WHERE id = $1
     FOR UPDATE`,
    [itemId],
  );
  if (!result.rows[0] || result.rows[0].archived_at) {
    const error = new Error('Inventory container not found.');
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

function sendOperationError(error, res, next) {
  if (error.status) {
    const payload = { message: error.message };
    if (error.code) payload.code = error.code;
    if (error.balances) payload.balances = error.balances;
    return res.status(error.status).json(payload);
  }
  if (error.code === '23514') {
    return res.status(409).json({
      message: 'The operation would create a negative inventory balance.',
    });
  }
  return next(error);
}

exports.transferItem = async (req, res, next) => {
  const itemId = Number(req.body?.item_id);
  const toLocationId = Number(req.body?.to_location_id);
  const fromLocationId = Number(req.body?.from_location_id);
  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'item_id is required.' });
  }
  if (!Number.isSafeInteger(toLocationId) || toLocationId < 1) {
    return res.status(400).json({ message: 'to_location_id is required.' });
  }

  let db = null;
  try {
    db = await pool.connect();
    await db.query('BEGIN');

    const item = await lockItem(db, itemId);
    if (item.review_status === 'needs_review') {
      const error = new Error(
        'Resolve this container before moving inventory.',
      );
      error.status = 409;
      error.code = 'ITEM_NEEDS_REVIEW';
      throw error;
    }

    const destination = await activeLocation(db, toLocationId);
    const source = await resolveSourceBalance(
      db,
      itemId,
      Number.isSafeInteger(fromLocationId) && fromLocationId > 0
        ? fromLocationId
        : null,
    );

    if (Number(source.location_id) === Number(destination.id)) {
      const error = new Error('Source and destination locations are the same.');
      error.status = 409;
      throw error;
    }

    // A G8I identifies one physical container. Moving less than the entire
    // container would create two physical containers under one barcode, so
    // partial moves are rejected and must use Split / Repack instead.
    if (req.body?.move_all === false || req.body?.quantity != null) {
      const requested = req.body?.quantity == null
        ? null
        : parseQuantity(req.body.quantity, 'quantity');
      if (requested === null || Math.abs(requested - source.quantity) > 0.0005) {
        const error = new Error(
          'A G8I physical container must move as one unit. Use Split / Repack to create a second physical container and new G8I.',
        );
        error.status = 409;
        error.code = 'PARTIAL_CONTAINER_MOVE_REQUIRES_REPACK';
        throw error;
      }
    }

    const actor = movementActor(req.user);
    const originalSourceQuantity = source.quantity;
    let measuredQuantity = source.quantity;
    if (
      req.body?.actual_remaining_quantity !== undefined &&
      req.body?.actual_remaining_quantity !== null &&
      req.body?.actual_remaining_quantity !== ''
    ) {
      measuredQuantity = parseQuantity(
        req.body.actual_remaining_quantity,
        'actual_remaining_quantity',
      );
    }

    if (Math.abs(measuredQuantity - source.quantity) > 0.0005) {
      await db.query(
        `UPDATE inventory
         SET quantity = $3, updated_at = NOW()
         WHERE item_id = $1 AND location_id = $2`,
        [itemId, source.location_id, measuredQuantity],
      );
      await recordMovement(db, {
        itemId,
        movementType: measuredQuantity < source.quantity ? 'consumption' : 'adjustment',
        fromLocationId: source.location_id,
        quantity: Math.abs(measuredQuantity - source.quantity),
        sourceBefore: source.quantity,
        sourceAfter: measuredQuantity,
        uom: item.uom,
        reason: 'Actual container quantity captured before relocation',
        metadata: { captured_during_transfer: true },
        ...actor,
      });
      source.quantity = measuredQuantity;
    }

    const quantity = source.quantity;
    const destinationResult = await db.query(
      `SELECT quantity::numeric AS quantity
       FROM inventory
       WHERE item_id = $1 AND location_id = $2
       FOR UPDATE`,
      [itemId, destination.id],
    );
    const destinationBefore = numeric(destinationResult.rows[0]?.quantity);
    const destinationAfter = destinationBefore + quantity;

    await db.query(
      `DELETE FROM inventory
       WHERE item_id = $1 AND location_id = $2`,
      [itemId, source.location_id],
    );

    await db.query(
      `INSERT INTO inventory (item_id, location_id, quantity)
       VALUES ($1,$2,$3)
       ON CONFLICT (item_id, location_id)
       DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
      [itemId, destination.id, destinationAfter],
    );

    await db.query(
      `UPDATE items
       SET container_status = 'available', emptied_at = NULL, last_updated = NOW()
       WHERE id = $1`,
      [itemId],
    );

    const movement = await recordMovement(db, {
      itemId,
      movementType: 'transfer',
      fromLocationId: source.location_id,
      toLocationId: destination.id,
      quantity,
      sourceBefore: quantity,
      sourceAfter: 0,
      destinationBefore,
      destinationAfter,
      uom: item.uom,
      reason: String(
        req.body?.reason || 'Barcode-directed whole-container relocation',
      ).trim(),
      metadata: {
        whole_container: true,
        original_source_quantity: originalSourceQuantity,
        measured_before_move: measuredQuantity,
      },
      ...actor,
    });

    await db.query('COMMIT');
    return res.json({
      message: 'Physical container moved successfully.',
      item,
      movement,
      from: {
        id: source.location_id,
        code: source.code,
        barcode: source.barcode,
      },
      to: destination,
      quantity,
      source_quantity: 0,
      destination_quantity: destinationAfter,
      measured_quantity: measuredQuantity,
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => undefined);
    return sendOperationError(error, res, next);
  } finally {
    db?.release();
  }
};

exports.setRemainingQuantity = async (req, res, next) => {
  const itemId = Number(req.params?.id);
  const requestedLocationId = Number(req.body?.location_id);
  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'Invalid item id.' });
  }

  let remaining;
  try {
    remaining = parseQuantity(
      req.body?.remaining_quantity,
      'remaining_quantity',
      { allowZero: true },
    );
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  let db = null;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const item = await lockItem(db, itemId);
    if (item.review_status === 'needs_review') {
      const error = new Error(
        'Resolve this container before updating its remaining quantity.',
      );
      error.status = 409;
      error.code = 'ITEM_NEEDS_REVIEW';
      throw error;
    }

    const source = await resolveSourceBalance(
      db,
      itemId,
      Number.isSafeInteger(requestedLocationId) && requestedLocationId > 0
        ? requestedLocationId
        : null,
    );
    const before = source.quantity;

    if (remaining === before) {
      await db.query('ROLLBACK');
      return res.json({
        message: 'Remaining quantity is unchanged.',
        quantity: remaining,
        location: source,
      });
    }

    if (remaining === 0) {
      await db.query(
        `DELETE FROM inventory
         WHERE item_id = $1 AND location_id = $2`,
        [itemId, source.location_id],
      );
    } else {
      await db.query(
        `UPDATE inventory
         SET quantity = $3, updated_at = NOW()
         WHERE item_id = $1 AND location_id = $2`,
        [itemId, source.location_id, remaining],
      );
    }

    const movementType =
      remaining === 0
        ? 'empty'
        : remaining < before
          ? 'consumption'
          : 'adjustment';
    const quantityChanged = Math.abs(remaining - before);

    await db.query(
      `UPDATE items
       SET
         container_status = $2,
         emptied_at = CASE WHEN $2 = 'empty' THEN NOW() ELSE NULL END,
         last_updated = NOW()
       WHERE id = $1`,
      [itemId, remaining === 0 ? 'empty' : 'available'],
    );

    const movement = await recordMovement(db, {
      itemId,
      movementType,
      fromLocationId: source.location_id,
      quantity: quantityChanged,
      sourceBefore: before,
      sourceAfter: remaining,
      uom: item.uom,
      reason: String(
        req.body?.reason ||
          (remaining === 0
            ? 'Container marked empty'
            : 'Remaining quantity updated'),
      ).trim(),
      metadata: { remaining_quantity: remaining },
      ...movementActor(req.user),
    });

    await db.query('COMMIT');
    return res.json({
      message:
        remaining === 0
          ? 'Container marked empty.'
          : 'Remaining quantity updated.',
      item_id: itemId,
      barcode: item.barcode,
      location: source,
      previous_quantity: before,
      remaining_quantity: remaining,
      consumed_quantity: remaining < before ? before - remaining : 0,
      movement,
      container_status: remaining === 0 ? 'empty' : 'available',
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => undefined);
    return sendOperationError(error, res, next);
  } finally {
    db?.release();
  }
};

exports.getMovementHistory = async (req, res, next) => {
  const itemId = Number(req.params?.id);
  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'Invalid item id.' });
  }

  try {
    const result = await pool.query(
      `SELECT
         movement.*,
         source.code AS from_location_code,
         destination.code AS to_location_code
       FROM inventory_movements AS movement
       LEFT JOIN locations AS source ON source.id = movement.from_location_id
       LEFT JOIN locations AS destination ON destination.id = movement.to_location_id
       WHERE movement.item_id = $1
       ORDER BY movement.created_at DESC, movement.id DESC
       LIMIT 250`,
      [itemId],
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
};

module.exports._test = { parseQuantity };
