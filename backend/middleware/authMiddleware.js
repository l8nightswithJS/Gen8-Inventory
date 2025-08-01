// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
// Adjust path: two levels up to the root config.js
const { JWT_SECRET } = require('../../config');

module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    console.log('Decoded JWT user:', req.user);
    next();
  });
};
