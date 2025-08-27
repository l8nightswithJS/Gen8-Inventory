// auth-service/controllers/authController.js
// CommonJS
const supabase = require('../lib/supabaseClient');
const jwt = require('jsonwebtoken');

/**
 * Small helper to make log lines easy to spot in Render
 */
const log = (...args) => console.log('[AUTH]', ...args);

/**
 * Create or update public.users row for the given auth user.
 * Uses service role key, so it bypasses RLS.
 */
async function ensureUserProfile(authUser, defaults = {}) {
  const userId = authUser?.id;
  if (!userId) throw new Error('ensureUserProfile: missing authUser.id');

  // Prefer username from metadata, else email prefix
  const meta = authUser.user_metadata || authUser.raw_user_meta_data || {};
  const email = authUser.email || meta.email || '';
  const username =
    meta.username ||
    (email.includes('@') ? email.split('@')[0] : 'user_' + userId.slice(0, 8));
  const role = meta.role || defaults.role || 'staff';
  const approved =
    typeof defaults.approved === 'boolean' ? defaults.approved : true; // allow immediate login unless you enforce approvals

  // Upsert the row by id
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        username,
        role,
        approved,
      },
      { onConflict: 'id' },
    )
    .select('id, username, role, approved')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Register: sign up + create profile row immediately.
 * If you want “manual approval”, set approved=false here.
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, role = 'staff' } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

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

    // Create the profile row
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
};

/**
 * Login: sign in with email/password, fetch profile.
 * If profile missing, auto-create it and continue.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

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
    if (!authUser) {
      return res.status(500).json({ message: 'No user returned from sign in' });
    }

    // Try to load profile
    let { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('approved, role, username')
      .eq('id', authUser.id)
      .single();

    // Auto-heal if profile is missing
    if (profileError || !userProfile) {
      log('login: profile not found, auto-creating →', {
        userId: authUser.id,
        email: authUser.email,
        profileError: profileError?.message || null,
      });
      try {
        const created = await ensureUserProfile(authUser, {
          role: 'staff',
          approved: true,
        });
        userProfile = {
          username: created.username,
          role: created.role,
          approved: created.approved,
        };
      } catch (upErr) {
        log('login: ensureUserProfile failed →', upErr.message);
        // Clean sign-out so the session doesn’t linger
        await supabase.auth.signOut();
        return res.status(401).json({ message: 'User profile not found.' });
        // (keep the message stable if your frontend depends on it)
      }
    }

    // Approval gate
    if (userProfile.approved === false) {
      await supabase.auth.signOut();
      return res.status(403).json({ message: 'Account pending approval' });
    }

    // App JWT
    const token = jwt.sign(
      { id: authUser.id, role: userProfile.role, email: authUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    log('login: success →', {
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
};

/**
 * Simple identity echo from app JWT (used by gateway/user services)
 */
exports.verify = async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Token is required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Optional: return current user info decoded from JWT header Authorization: Bearer <token>
 */
exports.me = async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const t = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!t) return res.status(401).json({ message: 'Missing token' });
  try {
    const decoded = jwt.verify(t, process.env.JWT_SECRET);
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.logout = async (_req, res) => {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  return res.json({ ok: true });
};
