// backend/middleware/requireRole.js
module.exports = function (...allowedRoles) {
  return (req, res, next) => {
    // Correctly access the role from user_metadata
    const role = req.user?.user_metadata?.role;

    if (!role) {
      return res
        .status(403)
        .json({ message: 'Access denied. Role not specified.' });
    }

    const hasRole = allowedRoles.includes(role);
    if (!hasRole) {
      return res
        .status(403)
        .json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};
