// auth-service/controllers/authController.js
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[AUTH] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
if (!JWT_SECRET) {
  console.error('[AUTH] Missing JWT_SECRET');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getBearer(req) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'username and password are required' });
    }

    // Determine email to use for Supabase Auth
    let email = null;

    if (username.includes('@')) {
      // Looks like an email
      email = username;
    } else {
      // Treat as app username -> find profile -> look up auth user email
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('id, username, role, approved') // add client_id if you have it
        .eq('username', username)
        .single();

      if (profileErr || !profile) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Get auth user to retrieve email
      const { data: adminUser, error: adminErr } =
        await supabase.auth.admin.getUserById(profile.id);
      if (adminErr || !adminUser?.user?.email) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      email = adminUser.user.email;
    }

    // 1) Verify credentials against Supabase Auth (email/password)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    if (signInError || !signInData?.user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const authUser = signInData.user;

    // 2) Fetch app profile from public.users (FK id === auth.users.id)
    const { data: profile, error: profileErr2 } = await supabase
      .from('users')
      .select('id, username, role, approved') // add client_id if present
      .eq('id', authUser.id)
      .single();

    if (profileErr2 || !profile) {
      return res
        .status(403)
        .json({
          message: 'User is not provisioned in application users table',
        });
    }
    if (!profile.approved) {
      return res.status(403).json({ message: 'User is not approved' });
    }

    // 3) Issue your own JWT for microservices
    const payload = {
      sub: profile.id,
      username: profile.username || authUser.email || email,
      role: profile.role || 'staff',
      // client_id: profile.client_id || null, // uncomment if you add this column
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('[AUTH] login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

async function verifyToken(req, res) {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return res.json({ ok: true, user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function me(req, res) {
  try {
    if (req.user) return res.json({ user: req.user });
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function logout(_req, res) {
  return res.json({ ok: true });
}

async function register(_req, res) {
  return res.status(405).json({ message: 'Registration is disabled' });
}

module.exports = { login, verifyToken, me, logout, register };
