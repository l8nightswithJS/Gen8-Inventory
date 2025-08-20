// backend/middleware/requireRole.js
module.exports = function (...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res
        .status(403)
        .json({ message: 'Access denied. Role not specified.' });
    }

    const hasRole = allowedRoles.includes(req.user.role);
    if (!hasRole) {
      return res
        .status(403)
        .json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};
