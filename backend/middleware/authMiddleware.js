// backend/middleware/authMiddleware.js
const supabase = require('../lib/supabaseClient');

module.exports = async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  // Use the Supabase client to verify the token
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    // This will catch invalid tokens, expired tokens, or other auth errors
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  // The token is valid. Attach the user object from Supabase to the request.
  req.user = data.user;
  next();
};
