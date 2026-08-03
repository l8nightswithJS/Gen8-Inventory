const jwt = require('jsonwebtoken');
const { sbAdmin } = require('../lib/supabaseClient');

const {
  JWT_SECRET,
  JWT_ISSUER = 'gen8-inventory-auth',
  JWT_TTL = '12h',
} = process.env;

async function refreshSession(req, res) {
  try {
    const currentUser = req.user;
    const userId = currentUser?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    const { data: profile, error: profileError } = await sbAdmin
      .from('users')
      .select('id, role, approved')
      .eq('id', userId)
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
      .select('client_id')
      .eq('user_id', profile.id);

    if (clientLinksError) {
      console.error('[AUTH] Session refresh client lookup failed:', clientLinksError);
      return res.status(500).json({ message: 'Session refresh failed' });
    }

    const clientIds = (clientLinks || []).map((link) => link.client_id);
    const payload = {
      id: profile.id,
      role: profile.role,
      email: currentUser.email || '',
      approved: profile.approved,
      client_ids: clientIds,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_TTL,
      issuer: JWT_ISSUER,
    });

    return res.json({ token, user: payload });
  } catch (error) {
    console.error('[AUTH] Session refresh failed:', error);
    return res.status(500).json({ message: 'Session refresh failed' });
  }
}

module.exports = refreshSession;
