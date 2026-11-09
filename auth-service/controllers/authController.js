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

  // Public user metadata is user-editable and must never determine privileges.
  const email = authUser.email || '';
  const role = 'staff';
  const approved =
    typeof defaults.approved === 'boolean' ? defaults.approved : false;

  // Preserve an existing profile (including administrator-approved accounts).
  // Some deployments create profiles through a database trigger at sign-up.
  const { data: existing, error: lookupError } = await sbAdmin
    .from('users')
    .select('id, role, approved')
    .eq('id', id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing;

  const { data, error } = await sbAdmin
    .from('users')
    .insert({ id, email, role, approved })
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
    const { email, password } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ message: 'Email and password are required' });

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data, error } = await sbAuth.auth.signUp({
      email: normalizedEmail,
      password,
      // Do not write role or approval information into user-controlled metadata.
    });

    if (error) {
      console.error('[AUTH][register] Supabase error:', error);
      return res.status(error.status || 500).json({ message: error.message });
    }
    if (!data?.user) return res.status(500).json({ message: 'Sign up failed' });

    // New accounts must be explicitly approved by an existing administrator.
    await ensureUserProfile(data.user, { approved: false });

    return res.status(201).json({
      message: 'Access requested. An administrator must approve your account before sign-in.',
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
// In auth-service/controllers/authController.js
// Replace the entire login function

async function login(req, res) {
  // --- LOG #1 ---
  console.log(`[${new Date().toISOString()}] LOGIN: Route handler started.`);

  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ message: 'Missing email or password' });

    const normalizedEmail = String(email).trim().toLowerCase();

    // --- LOG #2 ---
    console.log(
      `[${new Date().toISOString()}] LOGIN: Signing in with Supabase Auth for ${normalizedEmail}...`,
    );

    // Sign in with Supabase Auth
    const { data, error: signInError } = await sbAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // --- LOG #3 ---
    console.log(
      `[${new Date().toISOString()}] LOGIN: Supabase Auth signIn complete.`,
    );

    if (signInError || !data?.user) {
      console.error(
        `[${new Date().toISOString()}] LOGIN: Supabase Auth Error -`,
        signInError,
      );
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const authUser = data.user;

    // --- LOG #4 ---
    console.log(
      `[${new Date().toISOString()}] LOGIN: Fetching user profile from 'users' table...`,
    );

    // Get the user's profile from our public.users table
    let { data: profile, error: selErr } = await sbAdmin
      .from('users')
      .select('id, role, approved')
      .eq('id', authUser.id)
      .single();

    // --- LOG #5 ---
    console.log(`[${new Date().toISOString()}] LOGIN: Profile fetch complete.`);

    if (selErr || !profile) {
      // This block will run if the user exists in Supabase Auth but not in our public 'users' table yet
      console.log(
        `[${new Date().toISOString()}] LOGIN: Profile not found, creating one...`,
      );
      // Never approve an account simply because its profile is missing.
      profile = await ensureUserProfile(authUser, { approved: false });
      console.log(`[${new Date().toISOString()}] LOGIN: Profile created.`);
    }

    if (profile.approved !== true) {
      return res.status(403).json({ message: 'Account pending approval' });
    }

    // --- LOG #6 ---
    console.log(
      `[${new Date().toISOString()}] LOGIN: Fetching client links...`,
    );

    // Fetch all client IDs associated with this user from the new join table
    const { data: clientLinks, error: clientLinksError } = await sbAdmin
      .from('user_clients')
      .select('client_id')
      .eq('user_id', profile.id);

    if (clientLinksError) throw clientLinksError;

    // --- LOG #7 ---
    console.log(
      `[${new Date().toISOString()}] LOGIN: Client links fetch complete. Creating JWT.`,
    );

    // Create a simple array of client IDs, e.g., [1, 17, 25]
    const clientIds = clientLinks ? clientLinks.map((c) => c.client_id) : [];

    // JWT payload
    const payload = {
      id: profile.id,
      role: profile.role,
      email: authUser.email || normalizedEmail,
      approved: profile.approved,
      client_ids: clientIds,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    // --- LOG #8 ---
    console.log(
      `[${new Date().toISOString()}] LOGIN: JWT created. Sending final response.`,
    );
    return res.json({ token, user: payload });
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] LOGIN CATCH BLOCK: An unexpected error occurred.`,
      err,
    );
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
