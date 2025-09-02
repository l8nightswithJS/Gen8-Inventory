// auth-service/controllers/authController.js
const jwt = require('jsonwebtoken');
const { sbAuth, sbAdmin } = require('../lib/supabaseClient');

// ⬇️ Shared package for JWT handling
const { verifyJwt } = require('shared-auth');

const {
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h',

  AUTO_PROVISION = 'false',
  AUTH_ALLOW_UNAPPROVED = 'false',
} = process.env;

if (!JWT_SECRET) {
  console.error('[AUTH] Missing JWT_SECRET');
}

function getBearer(req) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * POST /api/auth/login
 * Accepts { email, password } OR { username, password }.
 */
async function login(req, res) {
  try {
    const { email: emailRaw, username: usernameRaw, password } = req.body || {};
    const identifier = (emailRaw || usernameRaw || '').trim();
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: 'username/email and password are required' });
    }

    // 1) Resolve to email
    let email = null;
    if (identifier.includes('@')) {
      email = identifier;
    } else {
      const { data: profileByUsername, error: profileErr } = await sbAdmin
        .from('users')
        .select('id, username, role, approved')
        .eq('username', identifier)
        .single();

      if (profileErr || !profileByUsername) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const { data: adminUser, error: adminErr } =
        await sbAdmin.auth.admin.getUserById(profileByUsername.id);
      if (adminErr || !adminUser?.user?.email) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      email = adminUser.user.email;
    }

    // 2) Sign in with Supabase Auth
    const { data: signInData, error: signInError } =
      await sbAuth.auth.signInWithPassword({ email, password });
    if (signInError || !signInData?.user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const authUser = signInData.user;

    // 3) Load app profile
    let { data: profile, error: profileErr2 } = await sbAdmin
      .from('users')
      .select('id, username, role, approved, client_id')
      .eq('id', authUser.id)
      .single();

    // 3a) Auto-provision if enabled
    const shouldProvision = String(AUTO_PROVISION).toLowerCase() === 'true';
    if ((profileErr2 || !profile) && shouldProvision) {
      const usernameForRow = identifier.includes('@')
        ? authUser.email || identifier
        : identifier;
      const { data: ins, error: insErr } = await sbAdmin
        .from('users')
        .insert([
          {
            id: authUser.id,
            username: usernameForRow,
            role: 'admin',
            approved: true,
          },
        ])
        .select('id, username, role, approved, client_id')
        .single();
      if (insErr) {
        return res.status(403).json({
          message: 'User is not provisioned in application users table',
        });
      }
      profile = ins;
      profileErr2 = null;
    }

    if (profileErr2 || !profile) {
      return res.status(403).json({
        message: 'User is not provisioned in application users table',
      });
    }

    // 4) Approval gate
    const allowUnapproved =
      String(AUTH_ALLOW_UNAPPROVED).toLowerCase() === 'true';
    if (!allowUnapproved && !profile.approved) {
      return res.status(403).json({ message: 'User is not approved' });
    }

    // 5) Issue JWT using shared-auth
    const payload = {
      id: profile.id,
      username: profile.username || authUser.email || email,
      role: profile.role || 'staff',
      approved: profile.approved,
      email: authUser.email || email,
      client_id: profile.client_id || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256', // ✅ fixed
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('[AUTH][login] error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

async function verifyToken(req, res) {
  try {
    const token = req.body?.token || getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = verifyJwt(token); // ✅ use shared-auth
    return res.json({ ok: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function me(req, res) {
  try {
    if (req.user) return res.json({ user: req.user });
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = verifyJwt(token); // ✅ use shared-auth
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function logout(_req, res) {
  return res.json({ ok: true });
}

async function register(req, res) {
  const { email, password, username } = req.body;
  if (!email || !password || !username) {
    return res
      .status(400)
      .json({ message: 'Email, password, and username are required.' });
  }

  try {
    // 1. Create user in Supabase Auth
    const { data, error } = await sbAuth.auth.signUp({
      email,
      password,
      options: {
        data: { username, role: 'staff' },
      },
    });

    if (error) {
      console.error('Supabase registration error:', error);
      return res.status(error.status || 500).json({ message: error.message });
    }

    const user = data.user;

    // 2. Provision into your public.users table
    const { error: insertErr } = await sbAdmin.from('users').insert([
      {
        id: user.id,
        username,
        role: 'staff',
        approved: false,
      },
    ]);

    if (insertErr) {
      console.error(
        '[AUTH][register] Failed to insert into public.users:',
        insertErr,
      );
      return res.status(500).json({ message: 'Failed to provision user' });
    }

    // 3. Respond back
    return res.status(201).json({
      message:
        'User created successfully. An administrator must approve the account.',
      user,
    });
  } catch (err) {
    console.error('[AUTH][register] Unexpected error:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }
}

module.exports = { login, verifyToken, me, logout, register };
