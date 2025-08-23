// backend/middleware/requireRole.js
const supabase = require('../lib/supabaseClient');

module.exports = function (...allowedRoles) {
  // This middleware must now be async to perform the database lookup
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      // Fetch the user's profile from your public.users table
      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res
          .status(403)
          .json({ message: 'Access denied. User profile not found.' });
      }

      const userRole = profile.role;
      const hasPermission = allowedRoles.includes(userRole);

      if (!hasPermission) {
        return res
          .status(403)
          .json({ message: 'Access denied. Insufficient permissions.' });
      }

      // If permissions are valid, proceed to the next handler
      next();
    } catch (err) {
      next(err);
    }
  };
};
