const jwt = require('jsonwebtoken');

function verifyJwt(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set in environment');

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER || 'gen8-inventory-auth',
    });
    if (!payload || payload.approved !== true || !payload.id) {
      throw new Error('Account is not approved');
    }
    return payload;
  } catch {
    throw new Error('Invalid, expired, or unapproved token');
  }
}

module.exports = verifyJwt;
