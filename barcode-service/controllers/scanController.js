// In barcode-service/controllers/scanController.js (Complete File)
const pool = require('../db/pool');

const handleDbError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
    details: error.message,
  });
};

// @desc    Process a scanned barcode to identify its type (item or location)
// @route   POST /api/scan
// @access  Private
exports.processScan = async (req, res) => {
  const { barcode, client_id } = req.body;

  if (!barcode) {
    return res.status(400).json({ message: 'barcode is required' });
  }

  try {
    // 1. Check if it's a Location barcode (global)
    const locationResult = await pool.query(
      'SELECT * FROM locations WHERE code = $1 LIMIT 1',
      [barcode],
    );

    if (locationResult.rowCount > 0) {
      const location = locationResult.rows[0];
      let inventoryItems = [];
      if (client_id) {
        const inventoryResult = await pool.query(
          `SELECT i.*, inv.quantity
           FROM inventory inv
           JOIN items i ON i.id = inv.item_id
           WHERE inv.location_id = $1 AND i.client_id = $2`,
          [location.id, client_id],
        );
        inventoryItems = inventoryResult.rows || [];
      }

      const response = { ...location, items: inventoryItems };
      return res.json({ type: 'location', data: response });
    }

    // 2. If not a location, check if it's an Item barcode (requires client_id)
    if (client_id) {
      const itemResult = await pool.query(
        'SELECT * FROM items WHERE client_id = $1 AND barcode = $2 LIMIT 1',
        [client_id, barcode],
      );

      if (itemResult.rowCount > 0) {
        return res.json({ type: 'item', data: itemResult.rows[0] });
      }
    }

    // 3. If no match is found
    return res.status(404).json({ message: `Barcode "${barcode}" not found.` });
  } catch (error) {
    return handleDbError(res, error, 'processScan');
  }
};
