// inventory-service/controllers/locationsController.js
const pool = require('../db/pool');

const handleDbError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
    details: error.message,
  });
};

// @desc    Get all locations for a specific client
// @route   GET /api/locations
// @access  Private
exports.getLocations = async (req, res) => {
  try {
    const { client_id } = req.query;
    if (!client_id) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const result = await pool.query(
      'SELECT * FROM locations WHERE client_id = $1 ORDER BY id ASC',
      [client_id],
    );

    res.json(result.rows || []);
  } catch (error) {
    return handleDbError(res, error, 'getLocations');
  }
};

// @desc    Create a new location
// @route   POST /api/locations
// @access  Private
exports.createLocation = async (req, res) => {
  try {
    const { client_id, code, description } = req.body;

    const result = await pool.query(
      'INSERT INTO locations (client_id, code, description) VALUES ($1, $2, $3) RETURNING *',
      [client_id, code, description],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    return handleDbError(res, error, 'createLocation');
  }
};
