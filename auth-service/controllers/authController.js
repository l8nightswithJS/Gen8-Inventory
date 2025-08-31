// auth-service/controllers/authController.js (CommonJS)
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h', // adjust as needed
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[AUTH] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
if (!JWT_SECRET) {
  console.error('[AUTH] Missing JWT_SECRET (required to sign tokens)');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getBearer(req) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme === 'Bearer' && token) return token;
  return null;
}

/**
 * POST /api/auth/login
 * Expect body: { username: string, password: string }
 * NOTE: "username" must be the user's **email** for Supabase Auth.
 */
async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'username and password are required' });
    }

    // 1) Verify credentials against Supabase Auth (email/password)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: username, // treat "username" as email
        password,
      });

    if (signInError || !signInData?.user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const authUser = signInData.user; // from auth.users
    const authUserId = authUser.id;

    // 2) Fetch role/approved from public.users via FK (id == auth.users.id)
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('id, username, role, approved') // add client_id here if your schema has it
      .eq('id', authUserId)
      .single();

    if (profileErr || !profile) {
      // Safer default: user not provisioned in app table
      return res
        .status(403)
        .json({
          message: 'User is not provisioned in application users table',
        });
    }

    if (!profile.approved) {
      return res.status(403).json({ message: 'User is not approved' });
    }

    // 3) Issue your own service JWT for microservices
    const payload = {
      sub: profile.id,
      username: profile.username || authUser.email || username,
      role: profile.role || 'staff',
      // client_id: profile.client_id || null, // uncomment if you add this column
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({
      token,
      user: payload,
    });
  } catch (err) {
    console.error('[AUTH] login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

/**
 * POST /api/auth/verify
 * Header: Authorization: Bearer <token>
 */
async function verifyToken(req, res) {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return res.json({ ok: true, user: decoded });
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * GET /api/auth/me
 * Must be protected by auth middleware (sets req.user).
 * Also tolerates Bearer if middleware wasn’t applied.
 */
async function me(req, res) {
  try {
    if (req.user) return res.json({ user: req.user });
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return res.json({ user: decoded });
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * POST /api/auth/logout
 * Stateless JWTs: just acknowledge; client deletes its token.
 */
async function logout(_req, res) {
  return res.json({ ok: true });
}

/**
 * POST /api/auth/register (disabled by default)
 * If you need self-service sign-up, wire to supabase.auth.signUp
 * and create a row in public.users via trigger or here explicitly.
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
