// barcode-service/controllers/scanController.js
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

  if (!barcode || !client_id) {
    return res
      .status(400)
      .json({ message: 'barcode and client_id are required' });
  }

  try {
    // 1. Check if it's a Location barcode
    const locationResult = await pool.query(
      'SELECT * FROM locations WHERE client_id = $1 AND code = $2 LIMIT 1',
      [client_id, barcode],
    );

    if (locationResult.rowCount > 0) {
      const location = locationResult.rows[0];

      // Fetch inventory at this location
      const inventoryResult = await pool.query(
        `SELECT i.*, inv.quantity
         FROM inventory inv
         JOIN items i ON i.id = inv.item_id
         WHERE inv.location_id = $1`,
        [location.id],
      );

      const response = { ...location, items: inventoryResult.rows || [] };
      return res.json({ type: 'location', data: response });
    }

    // 2. If not a location, check if it's an Item barcode
    const itemResult = await pool.query(
      'SELECT * FROM items WHERE client_id = $1 AND barcode = $2 LIMIT 1',
      [client_id, barcode],
    );

    if (itemResult.rowCount > 0) {
      return res.json({ type: 'item', data: itemResult.rows[0] });
    }

    // 3. If no match is found
    return res
      .status(404)
      .json({ message: `Barcode "${barcode}" not found for this client.` });
  } catch (error) {
    return handleDbError(res, error, 'processScan');
  }
};
