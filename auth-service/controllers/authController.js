const jwt = require('jsonwebtoken');
const { sbAuth, sbAdmin } = require('../lib/supabaseClient');
const { verifyJwt } = require('shared-auth');

const {
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h',
} = process.env;

if (!JWT_SECRET) console.error('[AUTH] Missing JWT_SECRET');

function getBearer(req) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function register(_req, res) {
  return res.status(403).json({
    message: 'Self-registration is disabled. Contact an administrator.',
  });
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data, error: signInError } = await sbAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError || !data?.user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const authUser = data.user;
    const { data: profile, error: profileError } = await sbAdmin
      .from('users')
      .select('id, role, approved, first_name, last_name')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        message:
          'Account is not provisioned for this application. Contact an administrator.',
      });
    }

    if (profile.approved !== true) {
      return res.status(403).json({ message: 'Account pending approval' });
    }

    const { data: clientLinks, error: clientLinksError } = await sbAdmin
      .from('user_clients')
      .select('client_id, access_level')
      .eq('user_id', profile.id);

    if (clientLinksError) {
      console.error('[AUTH] Failed to fetch client links:', clientLinksError);
      return res.status(500).json({ message: 'Login failed' });
    }

    const clientAccess = (clientLinks || []).map((link) => ({
      client_id: Number(link.client_id),
      access_level: link.access_level === 'read' ? 'read' : 'edit',
    }));

    const firstName = String(profile.first_name || '').trim();
    const lastName = String(profile.last_name || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const payload = {
      id: profile.id,
      role: profile.role,
      email: authUser.email || normalizedEmail,
      first_name: firstName,
      last_name: lastName,
      display_name: firstName,
      full_name: fullName,
      approved: profile.approved,
      client_ids: clientAccess.map((entry) => entry.client_id),
      client_access: clientAccess,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('[AUTH] Unexpected login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

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
  try {
    await sbAuth.auth.signOut();
  } catch {}
  return res.json({ ok: true });
}

module.exports = { register, login, verifyToken, me, logout };
