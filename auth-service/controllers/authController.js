// auth-service/controllers/authController.js (CommonJS)
const { sbAuth, sbAdmin } = require('../lib/supabaseClient');
const jwt = require('jsonwebtoken');

const log = (...a) => console.log('[AUTH]', ...a);

async function ensureUserProfile(authUser, defaults = {}) {
  const id = authUser?.id;
  if (!id) throw new Error('ensureUserProfile: missing authUser.id');

  const meta = authUser.user_metadata || authUser.raw_user_meta_data || {};
  const email = authUser.email || meta.email || '';
  const username =
    meta.username ||
    (email.includes('@') ? email.split('@')[0] : `user_${id.slice(0, 8)}`);

  const role = meta.role || defaults.role || 'staff';
  const approved =
    typeof defaults.approved === 'boolean' ? defaults.approved : true;

  // IMPORTANT: use the ADMIN client so RLS cannot block us
  const { data, error } = await sbAdmin
    .from('users')
    .upsert({ id, username, role, approved }, { onConflict: 'id' })
    .select('id, username, role, approved')
    .single();

  if (error) throw error;
  return data;
}

async function register(req, res, next) {
  try {
    const { email, password, role = 'staff' } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ message: 'Email and password are required' });

    const normalizedEmail = String(email).trim().toLowerCase();

    // Use ANON client for auth
    const { data, error } = await sbAuth.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          email: normalizedEmail,
          username: normalizedEmail.split('@')[0],
          role,
        },
      },
    });
    if (error) return res.status(400).json({ message: error.message });
    if (!data?.user) return res.status(500).json({ message: 'Sign up failed' });

    const profile = await ensureUserProfile(data.user, {
      role,
      approved: true,
    });
    log('register: profile', profile);
    res.status(201).json({ message: 'Registered', userId: data.user.id });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ message: 'Missing email or password.' });

    const normalizedEmail = String(email).trim().toLowerCase();

    // Use ANON client for sign-in
    const { data, error: signInError } = await sbAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInError)
      return res.status(401).json({ message: 'Invalid email or password' });

    const user = data?.user;
    if (!user)
      return res.status(500).json({ message: 'No user returned from sign in' });

    // Ensure profile using ADMIN client
    let { data: profile, error: selErr } = await sbAdmin
      .from('users')
      .select('id, username, role, approved')
      .eq('id', user.id)
      .single();

    if (selErr || !profile) {
      log('login: profile missing, auto-creating', {
        userId: user.id,
        email: user.email,
        profileError: selErr?.message,
      });
      profile = await ensureUserProfile(user, {
        role: 'staff',
        approved: true,
      });
    }

    if (profile.approved === false) {
      await sbAuth.auth.signOut();
      return res.status(403).json({ message: 'Account pending approval' });
    }

    if (!process.env.JWT_SECRET) {
      log('WARN: JWT_SECRET not set – refusing to issue token');
      return res.status(500).json({ message: 'Server misconfigured (JWT)' });
    }

    const token = jwt.sign(
      { id: user.id, role: profile.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    log('login: success', {
      id: user.id,
      role: profile.role,
      username: profile.username,
    });
    return res.json({ token, role: profile.role, username: profile.username });
  } catch (err) {
    log(
      'login error',
      JSON.stringify({ message: err.message, stack: err.stack }, null, 2),
    );
    next(err);
  }
}

async function verify(req, res) {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Token is required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
const verifyToken = verify;

async function me(req, res) {
  const auth = req.headers['authorization'] || '';
  const t = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!t) return res.status(401).json({ message: 'Missing token' });
  try {
    const decoded = jwt.verify(t, process.env.JWT_SECRET);
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

async function logout(_req, res) {
  try {
    await sbAuth.auth.signOut();
  } catch {}
  return res.json({ ok: true });
}

module.exports = { register, login, verify, verifyToken, me, logout };
