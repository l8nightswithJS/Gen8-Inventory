const jwt = require('jsonwebtoken');

function verifyJwt(token) {
  const secret = process.env.JWT_SECRET;
  const issuer = process.env.JWT_ISSUER || 'gen8-inventory-auth';

  if (!secret) {
    throw new Error('JWT verification is not configured');
  }

  try {
    return jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer,
    });
  } catch {
    throw new Error('Invalid or expired token');
  }
}

module.exports = verifyJwt;
