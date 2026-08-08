const pool = require('../db/pool');

const handleDbError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
  });
};

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function locationPayload(body = {}) {
  return {
    code: String(body.code || '').trim().toUpperCase(),
    description: normalizeOptional(body.description),
    barcode: normalizeOptional(body.barcode)?.toUpperCase() || null,
    locationType: String(body.location_type || 'other').trim().toLowerCase(),
    zone: normalizeOptional(body.zone)?.toUpperCase() || null,
    rack: normalizeOptional(body.rack)?.toUpperCase() || null,
    shelf: normalizeOptional(body.shelf)?.toUpperCase() || null,
    binPosition: normalizeOptional(body.bin_position)?.toUpperCase() || null,
    active: body.active !== false,
  };
}

exports.getLocations = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM locations
       ORDER BY
         CASE WHEN location_type = 'staging' THEN 0 ELSE 1 END,
         coalesce(zone, ''),
         coalesce(rack, ''),
         coalesce(shelf, ''),
         coalesce(bin_position, ''),
         code`,
    );
    return res.json(result.rows || []);
  } catch (error) {
    return handleDbError(res, error, 'getLocations');
  }
};

exports.createLocation = async (req, res) => {
  try {
    const payload = locationPayload(req.body);
    const result = await pool.query(
      `INSERT INTO locations (
         code, description, barcode, location_type,
         zone, rack, shelf, bin_position, active
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        payload.code,
        payload.description,
        payload.barcode,
        payload.locationType,
        payload.zone,
        payload.rack,
        payload.shelf,
        payload.binPosition,
        payload.active,
      ],
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A location with this code or barcode already exists.',
      });
    }
    if (error.code === '23514') {
      return res.status(400).json({ message: 'Invalid location type.' });
    }
    return handleDbError(res, error, 'createLocation');
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await pool.query(
      'SELECT * FROM locations WHERE id = $1',
      [id],
    );
    if (!current.rows[0]) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    const payload = locationPayload({ ...current.rows[0], ...req.body });
    const isSystem = current.rows[0].is_system === true;
    const code = isSystem ? current.rows[0].code : payload.code;
    const barcode = isSystem ? current.rows[0].barcode : payload.barcode;

    const result = await pool.query(
      `UPDATE locations
       SET
         code = $1,
         description = $2,
         barcode = $3,
         location_type = $4,
         zone = $5,
         rack = $6,
         shelf = $7,
         bin_position = $8,
         active = $9
       WHERE id = $10
       RETURNING *`,
      [
        code,
        payload.description,
        barcode,
        payload.locationType,
        payload.zone,
        payload.rack,
        payload.shelf,
        payload.binPosition,
        isSystem ? true : payload.active,
        id,
      ],
    );
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A location with this code or barcode already exists.',
      });
    }
    if (error.code === '23514') {
      return res.status(400).json({ message: 'Invalid location type.' });
    }
    return handleDbError(res, error, 'updateLocation');
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await pool.query(
      'SELECT id, code, is_system FROM locations WHERE id = $1',
      [id],
    );
    if (!current.rows[0]) {
      return res.status(404).json({ message: 'Location not found.' });
    }
    if (current.rows[0].is_system) {
      return res.status(409).json({
        message: `${current.rows[0].code} is a system location and cannot be deleted.`,
      });
    }

    const balance = await pool.query(
      `SELECT 1 FROM inventory
       WHERE location_id = $1 AND quantity > 0
       LIMIT 1`,
      [id],
    );
    if (balance.rows.length > 0) {
      return res.status(409).json({
        message: 'Cannot delete a location that contains inventory. Move all stock first.',
      });
    }

    const history = await pool.query(
      `SELECT 1
       FROM inventory_movements
       WHERE from_location_id = $1 OR to_location_id = $1
       LIMIT 1`,
      [id],
    );
    if (history.rows.length > 0) {
      return res.status(409).json({
        code: 'LOCATION_HAS_HISTORY',
        message:
          'This location has inventory movement history and cannot be deleted. Mark it inactive instead so the audit trail remains readable.',
      });
    }

    await pool.query('DELETE FROM locations WHERE id = $1', [id]);
    return res.json({ message: 'Location deleted successfully.' });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        message:
          'This location is referenced by inventory data and cannot be deleted. Mark it inactive instead.',
      });
    }
    return handleDbError(res, error, 'deleteLocation');
  }
};

module.exports._test = { locationPayload };
