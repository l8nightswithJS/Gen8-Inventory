// Authorization for routes that explicitly identify a project/client.
// Object-ID routes also need a database ownership lookup (see service middleware).
function requireClientMatch(req, res, next) {
  const allowed = req.user?.client_ids;
  if (!Array.isArray(allowed)) {
    return res.status(403).json({ error: 'Forbidden: Missing client scope in token.' });
  }

  const clientId = req.params?.clientId ?? req.query?.client_id ?? req.body?.client_id;
  if (clientId === undefined || clientId === null || clientId === '') {
    return next();
  }

  const numeric = Number(clientId);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) {
    return res.status(400).json({ error: 'Invalid client ID.' });
  }

  if (!allowed.map(Number).includes(numeric)) {
    return res.status(403).json({ error: 'Forbidden: You do not have access to this client.' });
  }
  return next();
}

module.exports = requireClientMatch;
