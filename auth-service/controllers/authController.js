const jwt = require('jsonwebtoken');
const { sbAuth } = require('../lib/supabaseClient');
const { verifyJwt } = require('shared-auth');
const {
  buildSessionPayload,
  SessionLoadError,
} = require('../lib/sessionPayload');

const {
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '1h',
} = process.env;

function signApplicationToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT signing is not configured');
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_TTL,
    issuer: JWT_ISSUER,
  });
}

function getBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function register(_req, res) {
  return res.status(403).json({
    message: 'Self-registration is disabled. Contact an administrator.',
  });
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data, error } = await sbAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data?.user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload = await buildSessionPayload(
      data.user.id,
      data.user.email || normalizedEmail,
    );
    const token = signApplicationToken(payload);
    return res.json({ token, user: payload });
  } catch (error) {
    if (error instanceof SessionLoadError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('[AUTH] Login failed:', {
      name: error?.name,
      message: error?.message,
    });
    return res.status(500).json({ message: 'Login failed' });
  }
}

async function verifyToken(req, res) {
  try {
    const token = req.body?.token || getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    return res.json({ ok: true, user: verifyJwt(token) });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function me(req, res) {
  if (!req.user) return res.status(401).json({ message: 'Invalid token' });
  return res.json({ user: req.user });
}

async function logout(_req, res) {
  // Application JWTs are stateless. The browser removes its local token.
  // Server-side revocation can be added later with token/session versioning.
  return res.json({ ok: true });
}

module.exports = {
  register,
  login,
  verifyToken,
  me,
  logout,
  _test: { signApplicationToken },
};
