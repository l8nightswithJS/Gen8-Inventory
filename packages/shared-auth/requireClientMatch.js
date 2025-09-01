function requireClientMatch(req, res, next) {
  if (!req.user?.client_id) {
    return res.status(403).json({ error: 'Missing tenant scope in token' });
  }

  // If client_id is included in request body, enforce match
  if (req.body?.client_id && req.body.client_id !== req.user.client_id) {
    return res.status(403).json({ error: 'Tenant mismatch' });
  }

  // If client_id comes from query params (optional)
  if (req.query?.client_id && req.query.client_id !== req.user.client_id) {
    return res.status(403).json({ error: 'Tenant mismatch' });
  }

  next();
}

module.exports = requireClientMatch;
