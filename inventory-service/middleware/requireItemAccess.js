const pool = require('../db/pool');

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) return Number.NaN;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

function getAccessMap(req) {
  const map = new Map();
  const entries = Array.isArray(req.user?.client_access) ? req.user.client_access : [];
  for (const entry of entries) {
    const id = parsePositiveInteger(entry?.client_id);
    const level = entry?.access_level;
    if (Number.isSafeInteger(id) && (level === 'read' || level === 'edit')) map.set(id, level);
  }
  if (map.size === 0 && Array.isArray(req.user?.client_ids)) {
    for (const value of req.user.client_ids) {
      const id = parsePositiveInteger(value);
      if (Number.isSafeInteger(id)) map.set(id, 'read');
    }
  }
  return map;
}

function effectiveLevel(req, accessMap, clientId) {
  if (req.user?.role === 'admin') return 'edit';
  const level = accessMap.get(clientId);
  if (req.user?.role === 'external_viewer' && level) return 'read';
  return level;
}

function sendNotFound(res) {
  return res.status(404).json({ message: 'Item not found' });
}

function requireItemAccess({ source = 'params', key = 'id', permission = 'read' } = {}) {
  return async function itemAccessMiddleware(req, res, next) {
    const accessMap = getAccessMap(req);
    const itemId = parsePositiveInteger(req[source]?.[key]);
    if (!Number.isSafeInteger(itemId)) return res.status(400).json({ message: 'Invalid item ID' });

    try {
      const result = await pool.query('SELECT id, client_id FROM items WHERE id = $1', [itemId]);
      const item = result.rows?.[0];
      const itemClientId = parsePositiveInteger(item?.client_id);
      if (!item) return sendNotFound(res);

      const level = effectiveLevel(req, accessMap, itemClientId);
      if (!level) return sendNotFound(res);
      if (permission === 'edit' && level !== 'edit') {
        return res.status(403).json({ message: 'Read-only access: this account cannot change this project.' });
      }

      req.itemId = itemId;
      req.itemClientId = itemClientId;
      req.clientId = itemClientId;
      req.clientAccessLevel = level;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function requireItemListAccess({ source = 'body', key = 'item_ids', permission = 'read' } = {}) {
  return async function itemListAccessMiddleware(req, res, next) {
    const accessMap = getAccessMap(req);
    const submittedIds = req[source]?.[key];
    if (!Array.isArray(submittedIds) || submittedIds.length === 0) {
      return res.status(400).json({ message: 'item_ids array is required' });
    }

    const parsedIds = submittedIds.map(parsePositiveInteger);
    if (parsedIds.some((value) => !Number.isSafeInteger(value))) {
      return res.status(400).json({ message: 'Invalid item ID' });
    }

    const uniqueItemIds = [...new Set(parsedIds)];
    try {
      const result = await pool.query('SELECT id, client_id FROM items WHERE id = ANY($1::bigint[])', [uniqueItemIds]);
      if ((result.rows || []).length !== uniqueItemIds.length) return sendNotFound(res);

      for (const row of result.rows || []) {
        const clientId = parsePositiveInteger(row.client_id);
        const level = effectiveLevel(req, accessMap, clientId);
        if (!level) return sendNotFound(res);
        if (permission === 'edit' && level !== 'edit') {
          return res.status(403).json({ message: 'Read-only access: this account cannot change this project.' });
        }
      }

      req.itemIds = uniqueItemIds;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requireItemAccess, requireItemListAccess };
