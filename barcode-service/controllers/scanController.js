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

exports.processScan = async (req, res) => {
  const barcode = String(req.body?.barcode || '').trim();
  const clientId = normalizeClientId(req.body?.client_id);

  if (!barcode) {
    return res.status(400).json({ message: 'barcode is required' });
  }

  try {
    // Locations are global and are scanned by their unique code.
    const locationResult = await pool.query(
      `SELECT id, code, description
       FROM locations
       WHERE code = $1
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
           ORDER BY item.part_number, item.lot_number, item.id`,
          [location.id, clientId],
        );

        inventoryItems = inventoryResult.rows.map((row) => {
          const { quantity, ...item } = row;
          return {
            item,
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
        message: 'client_id is required when scanning an inventory item.',
      });
    }

    // Only the unique internal/container barcode resolves a single item.
    // Vendor barcodes are intentionally non-unique and are not used here.
    const itemResult = await pool.query(
      `SELECT
         item.*,
         COALESCE(SUM(inventory.quantity), 0)::numeric AS total_quantity,
         COALESCE(
           string_agg(DISTINCT location.code, ', ' ORDER BY location.code),
           ''
         ) AS inventory_location
       FROM items AS item
       LEFT JOIN inventory ON inventory.item_id = item.id
       LEFT JOIN locations AS location ON location.id = inventory.location_id
       WHERE item.client_id = $1
         AND item.barcode = $2
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
        },
      });
    }

    return res.status(404).json({ message: `Barcode "${barcode}" not found.` });
  } catch (error) {
    return handleDbError(res, error, 'processScan');
  }
};

module.exports._test = { normalizeClientId };
