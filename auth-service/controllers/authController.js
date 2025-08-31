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
  async function login(req, res) {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res
          .status(400)
          .json({ message: 'username and password are required' });
      }

      let email = null;

      if (username.includes('@')) {
        email = username.trim();
      } else {
        const { data: profile, error: profileErr } = await supabase
          .from('users')
          .select('id, username, role, approved')
          .eq('username', username)
          .single();

        if (profileErr || !profile) {
          console.error(
            '[AUTH][login] no profile for username:',
            username,
            profileErr,
          );
          return res.status(401).json({ message: 'Invalid credentials' });
        }

        const { data: adminUser, error: adminErr } =
          await supabase.auth.admin.getUserById(profile.id);
        if (adminErr || !adminUser?.user?.email) {
          console.error(
            '[AUTH][login] admin lookup failed for id:',
            profile.id,
            adminErr,
          );
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        email = adminUser.user.email;
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      if (signInError || !signInData?.user) {
        console.error(
          '[AUTH][login] signIn error for email:',
          email,
          signInError,
        );
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const { data: profile2, error: profileErr2 } = await supabase
        .from('users')
        .select('id, username, role, approved')
        .eq('id', signInData.user.id)
        .single();

      if (profileErr2 || !profile2) {
        console.error(
          '[AUTH][login] no app profile for auth user id:',
          signInData.user.id,
          profileErr2,
        );
        return res
          .status(403)
          .json({
            message: 'User is not provisioned in application users table',
          });
      }
      if (!profile2.approved) {
        console.warn('[AUTH][login] user not approved:', profile2.id);
        return res.status(403).json({ message: 'User is not approved' });
      }

      const payload = {
        sub: profile2.id,
        username: profile2.username || email,
        role: profile2.role || 'staff',
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
