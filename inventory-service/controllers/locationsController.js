// In inventory-service/controllers/locationsController.js (Updated)
const pool = require('../db/pool');

const handleDbError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
    details: error.message,
  });
};

// @desc    Get all global locations
// @route   GET /locations
exports.getLocations = async (req, res) => {
  try {
    // Now fetches ALL locations, no longer filtered by client_id
    const result = await pool.query(
      'SELECT * FROM locations ORDER BY code ASC',
    );
    res.json(result.rows || []);
  } catch (error) {
    return handleDbError(res, error, 'getLocations');
  }
};

// @desc    Create a new global location
// @route   POST /locations
exports.createLocation = async (req, res) => {
  try {
    // No longer needs a client_id
    const { code, description } = req.body;

    const result = await pool.query(
      'INSERT INTO locations (code, description) VALUES ($1, $2) RETURNING *',
      [code, description],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Handle unique constraint violation on the 'code'
    if (error.code === '23505') {
      return res
        .status(409)
        .json({ message: 'A location with this code already exists.' });
    }
    return handleDbError(res, error, 'createLocation');
  }
};

// In inventory-service/controllers/locationsController.js

// @desc    Delete a location
// @route   DELETE /api/locations/:id
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM locations WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    res.status(200).json({ message: 'Location deleted successfully.' });
  } catch (error) {
    // Handle potential foreign key constraint errors if items are in this location
    if (error.code === '23503') {
      // foreign_key_violation
      return res
        .status(409)
        .json({
          message:
            'Cannot delete location because it contains inventory. Please move all items first.',
        });
    }
    return handleDbError(res, error, 'deleteLocation');
  }
};
