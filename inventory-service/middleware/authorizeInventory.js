const pool = require('../db/pool');

// Verify the parent client for object-ID requests; an item ID is not a client ID.
async function authorizeInventory(req, res, next) {
  const path = req.path;
  let itemId;

  if (/^\/\d+$/.test(path)) itemId = Number(path.slice(1));
  else if (/^\/alerts\/\d+\/acknowledge$/.test(path)) {
    itemId = Number(path.split('/')[2]);
  } else if (path === '/adjust') itemId = Number(req.body?.item_id);

  if (itemId === undefined || path === '/by-location') return next();
  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ message: 'Invalid item ID.' });
  }

  try {
    const result = await pool.query('SELECT client_id FROM items WHERE id = $1', [itemId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found.' });

    const allowed = req.user?.client_ids;
    if (!Array.isArray(allowed) || !allowed.map(Number).includes(Number(result.rows[0].client_id))) {
      return res.status(403).json({ message: 'Forbidden: Item is outside your assigned projects.' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authorizeInventory;
