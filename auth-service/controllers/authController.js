// auth-service/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h', // adjust as needed
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.error('[AUTH] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
if (!JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error('[AUTH] Missing JWT_SECRET (required to sign tokens)');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Helper to extract Bearer token
function getBearer(req) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme === 'Bearer' && token) return token;
  return null;
}

/**
 * POST /api/auth/login
 * Body: { username: string, password: string }
 * - "username" may be either username or email (we'll match either)
 */
async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'username and password are required' });
    }

    // Try matching by username OR email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, client_id, password_hash, password')
      .or(`username.eq.${username},email.eq.${username}`)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const hash = user.password_hash || user.password || '';
    const ok = hash && (await bcrypt.compare(password, hash));
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = {
      sub: user.id,
      username: user.username || user.email || username,
      role: user.role || 'staff',
      client_id: user.client_id || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username || user.email,
        role: payload.role,
        client_id: payload.client_id,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AUTH] login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

/**
 * POST /api/auth/verify
 * Header: Authorization: Bearer <token>
 * Used by other services (if they still call auth to verify)
 */
async function verifyToken(req, res) {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return res.json({ ok: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * GET /api/auth/me
 * Must be protected by authMiddleware (which decodes and sets req.user),
 * but we also tolerate Bearer here in case middleware isn’t applied.
 */
async function me(req, res) {
  try {
    const user = req.user;
    if (user) return res.json({ user });

    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return res.json({ user: decoded });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * POST /api/auth/logout
 * Stateless JWTs can’t be invalidated server-side without a revocation list.
 * We simply acknowledge the request; client should delete its token.
 */
async function logout(_req, res) {
  return res.json({ ok: true });
}

/**
 * POST /api/auth/register (optional)
 * If you do not support public registration, respond accordingly.
 * You can implement user creation + hashing here when you’re ready.
 */
async function register(_req, res) {
  return res.status(405).json({ message: 'Registration is disabled' });
}

module.exports = {
  login,
  verifyToken,
  me,
  logout,
  register,
};
