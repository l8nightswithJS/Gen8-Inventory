const jwt = require('jsonwebtoken');

function verifyJwt(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not set in environment');
  }

  try {
    return jwt.verify(token, secret) || console.log(token, secret); // returns decoded payload
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = verifyJwt;
