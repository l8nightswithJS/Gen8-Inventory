const pool = require('../db/pool');

const handleDbError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
  });
};

function normalizeClientId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeScan(value) {
  return String(value || '').trim();
}

exports.processScan = async (req, res) => {
  const barcode = normalizeScan(req.body?.barcode);
  const clientId = normalizeClientId(req.body?.client_id);

  if (!barcode) {
    return res.status(400).json({ message: 'barcode is required' });
  }

  try {
    // Fixed warehouse locations can be scanned by their human code or G8L barcode.
    const locationResult = await pool.query(
      `SELECT
         id, code, description, barcode, location_type,
         zone, rack, shelf, bin_position, is_system, active
       FROM locations
       WHERE active = true
         AND (upper(code) = upper($1) OR upper(barcode) = upper($1))
       LIMIT 1`,
      [barcode],
    );

    if (locationResult.rowCount > 0) {
      const location = locationResult.rows[0];
      let inventoryItems = [];

      if (clientId) {
        const inventoryResult = await pool.query(
          `SELECT
             item.*,
             inventory.quantity::numeric AS quantity
           FROM inventory
           JOIN items AS item ON item.id = inventory.item_id
           WHERE inventory.location_id = $1
             AND item.client_id = $2
             AND item.archived_at IS NULL
             AND inventory.quantity > 0
           ORDER BY item.part_number, item.lot_number, item.id`,
          [location.id, clientId],
        );

        inventoryItems = inventoryResult.rows.map((row) => {
          const { quantity, ...item } = row;
          return {
            item: {
              ...item,
              initial_quantity:
                item.initial_quantity == null ? null : Number(item.initial_quantity),
            },
            quantity: Number(quantity),
          };
        });
      }

      return res.json({
        type: 'location',
        data: { ...location, items: inventoryItems },
      });
    }

    if (!clientId) {
      return res.status(400).json({
        message: 'client_id is required when scanning an inventory container.',
      });
    }

    // Only the permanent internal G8I/container barcode resolves an item.
    // Vendor/manufacturer barcodes are intentionally non-unique.
    const itemResult = await pool.query(
      `SELECT
         item.*,
         COALESCE(SUM(inventory.quantity), 0)::numeric AS total_quantity,
         COALESCE(
           string_agg(DISTINCT location.code, ', ' ORDER BY location.code),
           ''
         ) AS inventory_location,
         COALESCE(
           jsonb_agg(
             DISTINCT jsonb_build_object(
               'location_id', location.id,
               'location_code', location.code,
               'location_barcode', location.barcode,
               'location_type', location.location_type,
               'quantity', inventory.quantity
             )
           ) FILTER (WHERE inventory.id IS NOT NULL AND inventory.quantity > 0),
           '[]'::jsonb
         ) AS inventory_levels
       FROM items AS item
       LEFT JOIN inventory ON inventory.item_id = item.id
       LEFT JOIN locations AS location ON location.id = inventory.location_id
       WHERE item.client_id = $1
         AND upper(item.barcode) = upper($2)
         AND item.archived_at IS NULL
       GROUP BY item.id
       LIMIT 1`,
      [clientId, barcode],
    );

    if (itemResult.rowCount > 0) {
      const item = itemResult.rows[0];
      return res.json({
        type: 'item',
        data: {
          ...item,
          total_quantity: Number(item.total_quantity),
          initial_quantity:
            item.initial_quantity == null ? null : Number(item.initial_quantity),
          inventory_levels: (item.inventory_levels || []).map((level) => ({
            ...level,
            quantity: Number(level.quantity),
          })),
        },
      });
    }

    return res.status(404).json({ message: `Barcode "${barcode}" not found.` });
  } catch (error) {
    return handleDbError(res, error, 'processScan');
  }
};

module.exports._test = { normalizeClientId, normalizeScan };
