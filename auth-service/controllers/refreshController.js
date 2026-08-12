const jwt = require('jsonwebtoken');
const {
  buildSessionPayload,
  SessionLoadError,
} = require('../lib/sessionPayload');

const {
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '1h',
} = process.env;

async function refreshSession(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid session' });
    }
    if (!JWT_SECRET) {
      throw new Error('JWT signing is not configured');
    }

    const payload = await buildSessionPayload(userId, req.user?.email || '');
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({ token, user: payload });
  } catch (error) {
    if (error instanceof SessionLoadError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('[AUTH] Session refresh failed:', {
      name: error?.name,
      message: error?.message,
    });
    return res.status(500).json({ message: 'Session refresh failed' });
  }
}

module.exports = refreshSession;
