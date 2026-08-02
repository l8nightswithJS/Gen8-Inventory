const pool = require('../db/pool');

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;

  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) return Number.NaN;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

function getAllowedClientIds(req) {
  const clientIds = req.user?.client_ids;
  if (!Array.isArray(clientIds)) return null;

  return new Set(
    clientIds
      .map(parsePositiveInteger)
      .filter((value) => Number.isSafeInteger(value)),
  );
}

function sendNotFound(res) {
  return res.status(404).json({ message: 'Item not found' });
}

function requireItemAccess({ source = 'params', key = 'id' } = {}) {
  return async function itemAccessMiddleware(req, res, next) {
    const allowedClientIds = getAllowedClientIds(req);

    if (!allowedClientIds) {
      return res.status(403).json({
        message: 'Forbidden: Missing client scope in token.',
      });
    }

    const itemId = parsePositiveInteger(req[source]?.[key]);

    if (!Number.isSafeInteger(itemId)) {
      return res.status(400).json({ message: 'Invalid item ID' });
    }

    try {
      const result = await pool.query(
        'SELECT id, client_id FROM items WHERE id = $1',
        [itemId],
      );

      const item = result.rows?.[0];
      const itemClientId = parsePositiveInteger(item?.client_id);

      // Use the same response for missing and unauthorized records so callers
      // cannot enumerate item IDs belonging to another client.
      if (!item || !allowedClientIds.has(itemClientId)) {
        return sendNotFound(res);
      }

      req.itemId = itemId;
      req.itemClientId = itemClientId;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function requireItemListAccess({ source = 'body', key = 'item_ids' } = {}) {
  return async function itemListAccessMiddleware(req, res, next) {
    const allowedClientIds = getAllowedClientIds(req);

    if (!allowedClientIds) {
      return res.status(403).json({
        message: 'Forbidden: Missing client scope in token.',
      });
    }

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
      const result = await pool.query(
        'SELECT id, client_id FROM items WHERE id = ANY($1::bigint[])',
        [uniqueItemIds],
      );

      const accessibleItemIds = new Set(
        (result.rows || [])
          .filter((row) =>
            allowedClientIds.has(parsePositiveInteger(row.client_id)),
          )
          .map((row) => parsePositiveInteger(row.id)),
      );

      const everyItemIsAccessible = uniqueItemIds.every((id) =>
        accessibleItemIds.has(id),
      );

      if (!everyItemIsAccessible) {
        return sendNotFound(res);
      }

      req.itemIds = uniqueItemIds;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  requireItemAccess,
  requireItemListAccess,
};
