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

  // Backward compatibility for tokens issued before per-client access levels.
  if (map.size === 0 && Array.isArray(user?.client_ids)) {
    for (const value of user.client_ids) {
      const id = parseClientId(value);
      if (id) map.set(id, 'edit');
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

      const level = accessMapFromUser(req.user).get(clientId);
      if (!level) {
        return res.status(404).json({ message: 'Resource not found.' });
      }

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

module.exports = requireClientPermission;
