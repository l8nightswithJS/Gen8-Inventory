const pool = require('../db/pool');

async function authorizeLabels(req, res, next) {
  const allowed = req.user?.client_ids;
  if (!Array.isArray(allowed)) {
    return res.status(403).json({ message: 'Missing project access.' });
  }
  const scopes = allowed.map(Number);

  if (req.path === '/print/all') {
    const clientId = Number(req.body?.client_id ?? req.query?.client_id);
    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ message: 'Valid client_id required.' });
    }
    if (!scopes.includes(clientId)) {
      return res.status(403).json({ message: 'Forbidden: Project not assigned.' });
    }
    return next();
  }

  if (req.path === '/print/selected') {
    const ids = req.body?.item_ids;
    if (!Array.isArray(ids) || !ids.length || ids.some(id => !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) {
      return res.status(400).json({ message: 'Valid item_ids required.' });
    }
    const uniqueIds = [...new Set(ids.map(Number))];
    try {
      const result = await pool.query(
        'SELECT id, client_id FROM items WHERE id = ANY($1::int[])',
        [uniqueIds],
      );
      if (result.rows.length !== uniqueIds.length) {
        return res.status(404).json({ message: 'One or more items not found.' });
      }
      if (result.rows.some(row => !scopes.includes(Number(row.client_id)))) {
        return res.status(403).json({ message: 'Forbidden: One or more items are outside assigned projects.' });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  }
  return next();
}

module.exports = authorizeLabels;
