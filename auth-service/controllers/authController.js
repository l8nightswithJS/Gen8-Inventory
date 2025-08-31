// auth-service/controllers/authController.js
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h',

  // Hotfix toggles:
  // If true, we will insert a profile row in public.users on first successful Auth sign-in.
  // Leave false/undefined in prod if you don't want auto-provision.
  AUTO_PROVISION = 'false',
  // If true, bypass "approved" gate (useful while bootstrapping).
  AUTH_ALLOW_UNAPPROVED = 'false',
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

/**
 * POST /api/auth/login
 * Body can be: { email, password }  OR  { username, password }
 * - If identifier contains "@", treat as email; otherwise treat as username and map to email.
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

    // Resolve to an email address for Supabase Auth
    let email = null;

    if (identifier.includes('@')) {
      email = identifier;
    } else {
      // Lookup by app username -> get auth user to read its email
      const { data: profileByUsername, error: profileErr } = await supabase
        .from('users')
        .select('id, username, role, approved')
        .eq('username', identifier)
        .single();

      if (profileErr || !profileByUsername) {
        // Hide detail from client, log for server
        console.error(
          '[AUTH][login] no profile for username:',
          identifier,
          profileErr,
        );
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const { data: adminUser, error: adminErr } =
        await supabase.auth.admin.getUserById(profileByUsername.id);
      if (adminErr || !adminUser?.user?.email) {
        console.error(
          '[AUTH][login] admin lookup failed for id:',
          profileByUsername.id,
          adminErr,
        );
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      email = adminUser.user.email;
    }

    // 1) Verify credentials against Supabase Auth (email/password)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signInData?.user) {
      console.error(
        '[AUTH][login] signIn error for email:',
        email,
        signInError,
      );
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const authUser = signInData.user;

    // 2) Fetch app profile from public.users (FK id === auth.users.id)
    let { data: profile, error: profileErr2 } = await supabase
      .from('users')
      .select('id, username, role, approved') // add client_id if/when you have it
      .eq('id', authUser.id)
      .single();

    // 2a) Optional: auto-provision a profile row if missing (bootstrap convenience)
    const shouldProvision = String(AUTO_PROVISION).toLowerCase() === 'true';
    if ((profileErr2 || !profile) && shouldProvision) {
      const usernameForRow = identifier.includes('@')
        ? authUser.email || identifier
        : identifier;
      const { data: ins, error: insErr } = await supabase
        .from('users')
        .insert([
          {
            id: authUser.id,
            username: usernameForRow,
            role: 'admin',
            approved: true,
          },
        ]) // sensible bootstrap defaults
        .select('id, username, role, approved')
        .single();
      if (insErr) {
        console.error('[AUTH][login] auto-provision failed:', insErr);
        return res
          .status(403)
          .json({
            message: 'User is not provisioned in application users table',
          });
      }
      profile = ins;
      profileErr2 = null;
      console.warn(
        '[AUTH][login] auto-provisioned user profile for',
        authUser.id,
        usernameForRow,
      );
    }

    if (profileErr2 || !profile) {
      return res
        .status(403)
        .json({
          message: 'User is not provisioned in application users table',
        });
    }

    // 3) Approval gate (can bypass with env during bootstrap)
    const allowUnapproved =
      String(AUTH_ALLOW_UNAPPROVED).toLowerCase() === 'true';
    if (!allowUnapproved && !profile.approved) {
      return res.status(403).json({ message: 'User is not approved' });
    }

    // 4) Issue your own JWT for microservices
    const payload = {
      sub: profile.id,
      username: profile.username || authUser.email || email,
      role: profile.role || 'staff',
      // client_id: profile.client_id || null, // add when you add the column
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
