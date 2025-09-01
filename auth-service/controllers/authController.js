// auth-service/controllers/authController.js
const jwt = require('jsonwebtoken');

// ⬇️ Use YOUR shared clients: anon for sign-in, service role for admin/DB
// NOTE: adjust the relative path if your supabaseClient.js lives elsewhere.
// e.g. require('../../backend/lib/supabaseClient')
const { sbAuth, sbAdmin } = require('../lib/supabaseClient');

const {
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h',

  // Optional bootstrapping toggles
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
 * - If "username" (no "@"), we resolve it to an email via admin lookups.
 * - Sign-in is always done with sbAuth (anon key).
 * - Profile/role lookups use sbAdmin (service role).
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

    // 1) Resolve to email for Supabase Auth
    let email = null;
    if (identifier.includes('@')) {
      email = identifier;
    } else {
      // Lookup by app username -> read auth user to get email
      const { data: profileByUsername, error: profileErr } = await sbAdmin
        .from('users')
        .select('id, username, role, approved')
        .eq('username', identifier)
        .single();

      if (profileErr || !profileByUsername) {
        console.error(
          '[AUTH][login] no profile for username:',
          identifier,
          profileErr,
        );
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const { data: adminUser, error: adminErr } =
        await sbAdmin.auth.admin.getUserById(profileByUsername.id);
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

    // 2) Sign in against Supabase Auth with anon client
    const { data: signInData, error: signInError } =
      await sbAuth.auth.signInWithPassword({ email, password });
    if (signInError || !signInData?.user) {
      // ⬇️ MODIFICATION START: Add detailed JSON logging for the Supabase error
      console.error('--- SUPABASE SIGN-IN ERROR ---');
      console.error(JSON.stringify(signInError, null, 2));
      console.error('--- END SUPABASE SIGN-IN ERROR ---');
      // ⬆️ MODIFICATION END
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const authUser = signInData.user;

    // 3) Load app profile with service role (bypasses RLS)
    let { data: profile, error: profileErr2 } = await sbAdmin
      .from('users')
      .select('id, username, role, approved')
      .eq('id', authUser.id)
      .single();

    // 3a) Optional: auto-provision if missing during bootstrap
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
        .select('id, username, role, approved')
        .single();
      if (insErr) {
        console.error('[AUTH][login] auto-provision failed:', insErr);
        return res.status(403).json({
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
      return res.status(403).json({
        message: 'User is not provisioned in application users table',
      });
    }

    // 4) Approval gate (can bypass with env during bootstrap)
    const allowUnapproved =
      String(AUTH_ALLOW_UNAPPROVED).toLowerCase() === 'true';
    if (!allowUnapproved && !profile.approved) {
      return res.status(403).json({ message: 'User is not approved' });
    }

    // 5) Issue your **service** JWT (no token required on input)
    const payload = {
      sub: profile.id,
      username: profile.username || authUser.email || email,
      role: profile.role || 'staff',
      // client_id: profile.client_id || null, // add when you add this column
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({ token, user: payload });
  } catch (err) {
    // ⬇️ MODIFICATION START: Improve generic error logging
    console.error('--- [AUTH] GENERIC LOGIN ERROR ---');
    console.error(JSON.stringify(err, null, 2));
    console.error('--- END GENERIC LOGIN ERROR ---');
    // ⬆️ MODIFICATION END
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
