// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Read JWT secret straight from the environment
const { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  console.error('🚨 Missing JWT_SECRET in environment!');
  // You may want to throw here so the app fails fast if env var is missing
}

module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    // Attach the decoded JWT payload (user info) to the request
    req.user = payload;
    next();
  });
};
