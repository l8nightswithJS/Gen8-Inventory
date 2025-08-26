// This middleware assumes that a previous middleware (like authMiddleware)
// has already verified a JWT and attached the user payload to req.user.

const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    // 1. Check if a user object with a role exists on the request.
    // This user object comes from the decoded JWT, not a new database call.
    if (!req.user || !req.user.role) {
      return res
        .status(403)
        .json({ message: 'Forbidden: Role information missing from token.' });
    }

    // 2. Check if the user's role is in the list of allowed roles.
    // We make it case-insensitive for robustness.
    const userRole = req.user.role.toLowerCase();
    const hasPermission = allowedRoles.some(
      (allowedRole) => allowedRole.toLowerCase() === userRole,
    );

    if (hasPermission) {
      // 3. If they have permission, continue to the next handler.
      next();
    } else {
      // 4. If not, deny access.
      return res
        .status(403)
        .json({ message: 'Forbidden: Insufficient permissions.' });
    }
  };

module.exports = requireRole;
