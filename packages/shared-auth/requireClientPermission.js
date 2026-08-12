const requireClientMatch = require('./requireClientMatch');

function parseClientId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function accessMapFromUser(user) {
  const map = new Map();
  const entries = Array.isArray(user?.client_access) ? user.client_access : [];

  for (const entry of entries) {
    const id = parseClientId(entry?.client_id);
    const level = entry?.access_level;
    if (id && (level === 'read' || level === 'edit')) map.set(id, level);
  }

  // Backward compatibility for older tokens that only carried client_ids.
  // Missing an explicit access level must fail closed to read-only, never edit.
  if (map.size === 0 && Array.isArray(user?.client_ids)) {
    for (const value of user.client_ids) {
      const id = parseClientId(value);
      if (id) map.set(id, 'read');
    }
  }

  return map;
}

function requireClientPermission(required = 'read') {
  if (!['read', 'edit'].includes(required)) {
    throw new Error(`Unsupported client permission: ${required}`);
  }

  return [
    requireClientMatch,
    (req, res, next) => {
      if (req.user?.role === 'admin') return next();

      const clientId = parseClientId(req.clientId);
      if (!clientId) {
        return res.status(400).json({
          message: 'A valid client ID is required for this operation.',
        });
      }

      let level = accessMapFromUser(req.user).get(clientId);
      if (!level) return res.status(404).json({ message: 'Resource not found.' });

      // External partner accounts are always read-only even if a database row
      // is accidentally configured with edit access.
      if (req.user?.role === 'external_viewer') level = 'read';

      if (required === 'edit' && level !== 'edit') {
        return res.status(403).json({
          message: 'Read-only access: this account cannot change this project.',
        });
      }

      req.clientAccessLevel = level;
      return next();
    },
  ];
}

requireClientPermission._test = { accessMapFromUser, parseClientId };

module.exports = requireClientPermission;
