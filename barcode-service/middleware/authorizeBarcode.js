const pool = require('../db/pool');

// Resource ownership checks for item and barcode IDs, independent of user input.
async function authorizeBarcode(req, res, next) {
  const allowed = req.user?.client_ids;
  if (!Array.isArray(allowed)) {
    return res.status(403).json({ message: 'Missing project access.' });
  }
  const scopes = allowed.map(Number);
  let sql, id;

  if (req.method === 'POST' && req.path === '/barcodes') {
    sql = 'SELECT client_id FROM items WHERE id = $1';
    id = Number(req.body?.item_id);
  } else if (req.method === 'GET' && /^\/barcodes\/items\/\d+$/.test(req.path)) {
    sql = 'SELECT client_id FROM items WHERE id = $1';
    id = Number(req.path.split('/')[3]);
  } else if (req.method === 'DELETE' && /^\/barcodes\/\d+$/.test(req.path)) {
    sql = 'SELECT client_id FROM item_barcodes WHERE id = $1';
    id = Number(req.path.split('/')[2]);
  } else {
    return next();
  }

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid resource ID.' });
  }
  try {
    const result = await pool.query(sql, [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Resource not found.' });
    const clientId = Number(result.rows[0].client_id);
    if (!scopes.includes(clientId)) {
      return res.status(403).json({ message: 'Forbidden: Resource is outside assigned projects.' });
    }
    if (req.method === 'POST' && Number(req.body?.client_id) !== clientId) {
      return res.status(400).json({ message: 'Item and client_id do not match.' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authorizeBarcode;
