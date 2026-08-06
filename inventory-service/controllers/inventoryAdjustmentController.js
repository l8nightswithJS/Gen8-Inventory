const pool = require('../db/pool');

function parseNonNegativeQuantity(value, field) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${field} is required.`);
  }

  const normalized = String(value).trim();
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

  const normalized = String(value).trim();
  if (!/^-?\d+(?:\.\d{1,3})?$/.test(normalized)) {
    throw new Error(
      `${field} must be a number with no more than 3 decimal places.`,
    );
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
    changeQuantity = parseSignedQuantity(
      req.body?.change_quantity,
      'change_quantity',
    );
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    return res.status(400).json({ message: 'item_id must be a positive integer.' });
  }
  if (!Number.isSafeInteger(locationId) || locationId < 1) {
    return res
      .status(400)
      .json({ message: 'location_id must be a positive integer.' });
  }
  if (changeQuantity === 0) {
    return res
      .status(400)
      .json({ message: 'change_quantity must not be zero.' });
  }

  let dbClient = null;
  try {
    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const itemResult = await dbClient.query(
      `SELECT id, review_status
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [itemId],
    );

    if (itemResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ message: 'Item not found.' });
    }

    if (itemResult.rows[0].review_status === 'needs_review') {
      await dbClient.query('ROLLBACK');
      return res.status(409).json({
        code: 'ITEM_NEEDS_REVIEW',
        message:
          'Resolve this item’s imported quantity and location before adjusting stock.',
      });
    }

    const result = await dbClient.query(
      `INSERT INTO inventory (item_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (item_id, location_id)
       DO UPDATE SET
         quantity = inventory.quantity + EXCLUDED.quantity,
         updated_at = NOW()
       RETURNING quantity::numeric`,
      [itemId, locationId, changeQuantity],
    );

    await dbClient.query('COMMIT');

    return res.json({
      message: 'Inventory updated successfully',
      new_quantity: Number(result.rows[0].quantity),
    });
  } catch (error) {
    if (dbClient) await dbClient.query('ROLLBACK').catch(() => undefined);

    if (error.code === '23514') {
      return res
        .status(409)
        .json({ message: 'Update failed: quantity cannot be negative.' });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'The selected item or location does not exist.',
      });
    }
    return next(error);
  } finally {
    dbClient?.release();
  }
};

exports.resolveReview = async (req, res, next) => {
  const itemId = Number(req.params.id);
  const allocations = req.body?.allocations;
  let uom;

  try {
    if (!Number.isSafeInteger(itemId) || itemId < 1) {
      return res.status(400).json({ message: 'Invalid item id.' });
    }
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({
        message: 'At least one location allocation is required.',
      });
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
        throw new Error(
          `Allocation ${index + 1}: location_id must be a positive integer.`,
        );
      }
      if (seenLocations.has(locationId)) {
        throw new Error(
          `Allocation ${index + 1}: each location may appear only once.`,
        );
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

  let dbClient = null;
  try {
    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const itemResult = await dbClient.query(
      `SELECT id, review_status
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [itemId],
    );

    if (itemResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ message: 'Item not found.' });
    }

    if (itemResult.rows[0].review_status !== 'needs_review') {
      await dbClient.query('ROLLBACK');
      return res.status(409).json({
        code: 'ITEM_NOT_IN_REVIEW',
        message: 'This item no longer has unresolved inventory data.',
      });
    }

    await dbClient.query('DELETE FROM inventory WHERE item_id = $1', [itemId]);

    for (const allocation of normalizedAllocations) {
      await dbClient.query(
        `INSERT INTO inventory (item_id, location_id, quantity)
         VALUES ($1, $2, $3)`,
        [itemId, allocation.locationId, allocation.quantity],
      );
    }

    const updateResult = await dbClient.query(
      `UPDATE items
       SET
         uom = COALESCE($2, uom),
         review_status = 'clear',
         review_issues = '[]'::jsonb,
         reviewed_at = NOW(),
         last_updated = NOW()
       WHERE id = $1
       RETURNING *`,
      [itemId, uom],
    );

    await dbClient.query('COMMIT');

    const totalQuantity = normalizedAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity,
      0,
    );

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
    if (dbClient) await dbClient.query('ROLLBACK').catch(() => undefined);

    if (error.code === '23503') {
      return res.status(400).json({
        message: 'One or more selected locations no longer exist.',
      });
    }
    if (error.code === '23514') {
      return res.status(400).json({
        message: 'All resolved quantities must be non-negative.',
      });
    }
    return next(error);
  } finally {
    dbClient?.release();
  }
};

module.exports._test = {
  normalizeUom,
  parseNonNegativeQuantity,
  parseSignedQuantity,
};
