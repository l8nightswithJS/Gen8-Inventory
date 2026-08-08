function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getStagingLocation(db) {
  const result = await db.query(
    `SELECT id, code, barcode, description
     FROM locations
     WHERE upper(code) = 'STAGING' AND active = true
     LIMIT 1`,
  );
  if (result.rows.length === 0) {
    const error = new Error('STAGING location is not configured. Run the warehouse migration.');
    error.status = 500;
    throw error;
  }
  return result.rows[0];
}

async function recordMovement(
  db,
  {
    itemId,
    movementType,
    fromLocationId = null,
    toLocationId = null,
    quantity = 0,
    sourceBefore = null,
    sourceAfter = null,
    destinationBefore = null,
    destinationAfter = null,
    uom = null,
    reason = null,
    metadata = {},
  },
) {
  const result = await db.query(
    `INSERT INTO inventory_movements (
       item_id,
       movement_type,
       from_location_id,
       to_location_id,
       quantity,
       source_quantity_before,
       source_quantity_after,
       destination_quantity_before,
       destination_quantity_after,
       uom,
       reason,
       metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
     RETURNING *`,
    [
      itemId,
      movementType,
      fromLocationId,
      toLocationId,
      quantity,
      sourceBefore,
      sourceAfter,
      destinationBefore,
      destinationAfter,
      uom,
      reason,
      JSON.stringify(metadata || {}),
    ],
  );
  return result.rows[0];
}

async function getPositiveBalances(db, itemId, { lock = false } = {}) {
  const result = await db.query(
    `SELECT
       inventory.location_id,
       inventory.quantity::numeric AS quantity,
       location.code,
       location.barcode,
       location.description,
       location.location_type
     FROM inventory
     JOIN locations AS location ON location.id = inventory.location_id
     WHERE inventory.item_id = $1
       AND inventory.quantity > 0
     ORDER BY location.code
     ${lock ? 'FOR UPDATE OF inventory' : ''}`,
    [itemId],
  );

  return result.rows.map((row) => ({
    ...row,
    quantity: numeric(row.quantity),
  }));
}

async function resolveSourceBalance(db, itemId, requestedLocationId = null) {
  const balances = await getPositiveBalances(db, itemId, { lock: true });

  if (requestedLocationId) {
    const source = balances.find(
      (balance) => Number(balance.location_id) === Number(requestedLocationId),
    );
    if (!source) {
      const error = new Error('The selected source location has no available quantity for this container.');
      error.status = 409;
      error.code = 'SOURCE_BALANCE_NOT_FOUND';
      throw error;
    }
    return source;
  }

  if (balances.length === 0) {
    const error = new Error('This container has no available inventory balance.');
    error.status = 409;
    error.code = 'NO_AVAILABLE_BALANCE';
    throw error;
  }

  if (balances.length > 1) {
    const error = new Error('This container is split across multiple locations. Select the source location first.');
    error.status = 409;
    error.code = 'SOURCE_LOCATION_REQUIRED';
    error.balances = balances;
    throw error;
  }

  return balances[0];
}

module.exports = {
  getPositiveBalances,
  getStagingLocation,
  numeric,
  recordMovement,
  resolveSourceBalance,
};
