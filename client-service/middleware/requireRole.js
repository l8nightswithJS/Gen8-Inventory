// client-service/middleware/requireRole.jsS
const supabase = require('../lib/supabaseClient');

const requireRole =
  (...allowedRoles) =>
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
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

      const hasPermission = allowedRoles.includes(profile.role);
      if (!hasPermission) {
        return res
          .status(403)
          .json({ message: 'Access denied. Insufficient permissions.' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = requireRole;
