// auth-service/controllers/authController.js  (CommonJS)
const supabase = require('../lib/supabaseClient');
const jwt = require('jsonwebtoken');

const log = (...args) => console.log('[AUTH]', ...args);

// ---- helper: ensure profile row exists in public.users ----
async function ensureUserProfile(authUser, defaults = {}) {
  const userId = authUser?.id;
  if (!userId) throw new Error('ensureUserProfile: missing authUser.id');

  const meta = authUser.user_metadata || authUser.raw_user_meta_data || {};
  const email = authUser.email || meta.email || '';
  const username =
    meta.username ||
    (email.includes('@') ? email.split('@')[0] : `user_${userId.slice(0, 8)}`);
  const role = meta.role || defaults.role || 'staff';
  const approved =
    typeof defaults.approved === 'boolean' ? defaults.approved : true;

  const { data, error } = await supabase
    .from('users')
    .upsert({ id: userId, username, role, approved }, { onConflict: 'id' })
    .select('id, username, role, approved')
    .single();

  if (error) throw error;
  return data;
}

// ---- controller actions ----
async function register(req, res, next) {
  try {
    const { email, password, role = 'staff' } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
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

    if (error) {
      log('register: signUp error →', error.message);
      return res.status(400).json({ message: error.message });
    }
    if (!data?.user) {
      return res
        .status(500)
        .json({ message: 'Sign up failed: no user returned' });
    }

    const profile = await ensureUserProfile(data.user, {
      role,
      approved: true,
    });
    log('register: profile upserted →', profile);

    return res
      .status(201)
      .json({ message: 'Registered', userId: data.user.id });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: normalizedEmail,
        password,
      },
    );

    if (signInError) {
      log('login: signIn error →', signInError.message);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const authUser = data.user;
    if (!authUser)
      return res.status(500).json({ message: 'No user returned from sign in' });

    // Load or auto-create profile
    let { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('approved, role, username')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile) {
      log('login: profile missing, auto-creating', {
        userId: authUser.id,
        email: authUser.email,
        profileError: profileError?.message,
      });
      const created = await ensureUserProfile(authUser, {
        role: 'staff',
        approved: true,
      });
      userProfile = {
        username: created.username,
        role: created.role,
        approved: created.approved,
      };
    }

    if (userProfile.approved === false) {
      await supabase.auth.signOut();
      return res.status(403).json({ message: 'Account pending approval' });
    }

    const token = jwt.sign(
      { id: authUser.id, role: userProfile.role, email: authUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    log('login: success', {
      id: authUser.id,
      role: userProfile.role,
      username: userProfile.username,
    });
    return res.json({
      token,
      role: userProfile.role,
      username: userProfile.username,
    });
  } catch (err) {
    next(err);
  }
}

async function verify(req, res) {
  const { token } = req.body || {};
  log('verify: token present?', Boolean(token));
  if (!token) return res.status(400).json({ message: 'Token is required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// alias expected by some routes/middleware
const verifyToken = verify;

async function me(req, res) {
  const auth = req.headers['authorization'] || '';
  const t = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
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
    await supabase.auth.signOut();
  } catch {}
  return res.json({ ok: true });
}

module.exports = {
  register,
  login,
  verify,
  verifyToken, // keep this name for compatibility
  me,
  logout,
};
