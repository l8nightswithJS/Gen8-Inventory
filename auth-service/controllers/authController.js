// auth-service/controllers/authController.js (Hybrid)
const jwt = require('jsonwebtoken');
const { sbAuth, sbAdmin } = require('../lib/supabaseClient');
const { verifyJwt } = require('shared-auth');

const {
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h',
} = process.env;

if (!JWT_SECRET) {
  console.error('[AUTH] Missing JWT_SECRET');
}

function getBearer(req) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

// Ensure there's always a profile row in public.users
async function ensureUserProfile(authUser, defaults = {}) {
  const id = authUser?.id;
  if (!id) throw new Error('ensureUserProfile: missing authUser.id');

  const meta = authUser.user_metadata || authUser.raw_user_meta_data || {};
  const email = authUser.email || meta.email || '';
  const role = meta.role || defaults.role || 'staff';
  const approved =
    typeof defaults.approved === 'boolean' ? defaults.approved : true;

  const { data, error } = await sbAdmin
    .from('users')
    .upsert({ id, role, approved }, { onConflict: 'id' })
    .select('id, role, approved')
    .single();

  if (error) throw error;
  return data;
}

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { email, password, role = 'staff' } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ message: 'Email and password are required' });

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data, error } = await sbAuth.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          email: normalizedEmail,
          role,
        },
      },
    });

    if (error) {
      console.error('[AUTH][register] Supabase error:', error);
      return res.status(error.status || 500).json({ message: error.message });
    }
    if (!data?.user) return res.status(500).json({ message: 'Sign up failed' });

    // Always create a profile, default approved
    await ensureUserProfile(data.user, { role, approved: true });

    return res.status(201).json({
      message: 'Registered successfully',
      userId: data.user.id,
    });
  } catch (err) {
    console.error('[AUTH][register] error:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ message: 'Missing email or password' });

    const normalizedEmail = String(email).trim().toLowerCase();

    // Sign in with Supabase Auth
    const { data, error: signInError } = await sbAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError || !data?.user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const authUser = data.user;

    // Ensure profile
    let { data: profile, error: selErr } = await sbAdmin
      .from('users')
      .select('id, role, approved')
      .eq('id', authUser.id)
      .single();

    if (selErr || !profile) {
      profile = await ensureUserProfile(authUser, {
        role: 'staff',
        approved: true,
      });
    }

    if (profile.approved === false) {
      return res.status(403).json({ message: 'Account pending approval' });
    }

    // JWT payload
    const payload = {
      id: profile.id,
      role: profile.role,
      email: authUser.email || normalizedEmail,
      approved: profile.approved,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('[AUTH][login] error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

/**
 * POST /api/auth/verify
 */
async function verifyToken(req, res) {
  try {
    const token = req.body?.token || getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = verifyJwt(token);
    return res.json({ ok: true, user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * GET /api/auth/me
 */
async function me(req, res) {
  try {
    if (req.user) return res.json({ user: req.user });
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = verifyJwt(token);
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(_req, res) {
  try {
    await sbAuth.auth.signOut();
  } catch {}
  return res.json({ ok: true });
}

module.exports = { register, login, verifyToken, me, logout };
