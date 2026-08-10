function parseClientId(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) return Number.NaN;
  const id = Number(normalized);
  return Number.isSafeInteger(id) ? id : Number.NaN;
}

function getRequestedClientIds(req) {
  const candidates = [
    req.params?.clientId,
    req.params?.client_id,
    req.query?.client_id,
    req.query?.clientId,
    req.body?.client_id,
    req.body?.clientId,
  ];
  return candidates.map(parseClientId).filter((value) => value !== null);
}

function requireClientMatch(req, res, next) {
  const requestedClientIds = getRequestedClientIds(req);

  if (requestedClientIds.some((value) => Number.isNaN(value))) {
    return res.status(400).json({ error: 'Invalid client ID format in request.' });
  }

  const uniqueRequestedClientIds = [...new Set(requestedClientIds)];
  if (uniqueRequestedClientIds.length > 1) {
    return res.status(400).json({ error: 'Conflicting client IDs in request.' });
  }

  // Resource routes such as /items/:id are resolved by service-specific
  // authorization middleware. A generic :id must never be treated as a client ID.
  if (uniqueRequestedClientIds.length === 0) return next();

  const requestedClientId = uniqueRequestedClientIds[0];

  // Administrators are global application administrators. Their access does not
  // depend on rows in user_clients, but requested client IDs are still validated.
  if (req.user?.role === 'admin') {
    req.clientId = requestedClientId;
    return next();
  }

  const allowedClients = req.user?.client_ids;
  if (!Array.isArray(allowedClients)) {
    return res.status(403).json({ error: 'Forbidden: Missing client scope in token.' });
  }

  const normalizedAllowedClients = new Set(
    allowedClients.map(parseClientId).filter((value) => Number.isSafeInteger(value)),
  );

  if (!normalizedAllowedClients.has(requestedClientId)) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  req.clientId = requestedClientId;
  return next();
}

module.exports = requireClientMatch;
