const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    const userRole = String(req.user?.role || '').toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const hasPermission = allowedRoles.some(
      (allowedRole) => String(allowedRole).toLowerCase() === userRole,
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    return next();
  };

module.exports = requireRole;
