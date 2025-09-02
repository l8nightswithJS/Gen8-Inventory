const jwt = require('jsonwebtoken');
const { sbAuth, sbAdmin } = require('../lib/supabaseClient');
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
 * Accepts { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    // 1) Sign in with Supabase Auth
    const { data: signInData, error: signInError } =
      await sbAuth.auth.signInWithPassword({ email, password });
    if (signInError || !signInData?.user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const authUser = signInData.user;

    // 2) Load app profile
    let { data: profile, error: profileErr } = await sbAdmin
      .from('users')
      .select('id, role, approved, client_id')
      .eq('id', authUser.id)
      .single();

    // 2a) Auto-provision if enabled
    const shouldProvision = String(AUTO_PROVISION).toLowerCase() === 'true';
    if ((profileErr || !profile) && shouldProvision) {
      const { data: ins, error: insErr } = await sbAdmin
        .from('users')
        .insert([
          {
            id: authUser.id,
            role: 'staff',
            approved: false,
          },
        ])
        .select('id, role, approved, client_id')
        .single();
      if (insErr) {
        return res.status(403).json({
          message: 'User is not provisioned in application users table',
        });
      }
      profile = ins;
      profileErr = null;
    }

    if (profileErr || !profile) {
      return res.status(403).json({
        message: 'User is not provisioned in application users table',
      });
    }

    // 3) Approval gate
    const allowUnapproved =
      String(AUTH_ALLOW_UNAPPROVED).toLowerCase() === 'true';
    if (!allowUnapproved && !profile.approved) {
      return res.status(403).json({ message: 'User is not approved' });
    }

    // 4) Issue JWT
    const payload = {
      id: profile.id,
      role: profile.role || 'staff',
      approved: profile.approved,
      email: authUser.email,
      client_id: profile.client_id || null,
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

async function verifyToken(req, res) {
  try {
    const token = req.body?.token || getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = verifyJwt(token);
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
    const decoded = verifyJwt(token);
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function logout(_req, res) {
  return res.json({ ok: true });
}

async function register(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email and password are required.' });
  }

  const { data, error } = await sbAuth.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'staff' },
    },
  });

  if (error) {
    console.error('Supabase registration error:', error);
    return res.status(error.status || 500).json({ message: error.message });
  }

  return res.status(201).json({
    message:
      'User created successfully. An administrator must approve the account.',
    user: data.user,
  });
}

module.exports = { login, verifyToken, me, logout, register };
