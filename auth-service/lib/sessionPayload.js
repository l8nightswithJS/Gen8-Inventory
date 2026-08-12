const { sbAdmin } = require('./supabaseClient');

class SessionLoadError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'SessionLoadError';
    this.status = status;
  }
}

function cleanName(value) {
  return String(value || '').trim();
}

async function buildSessionPayload(userId, email = '') {
  const { data: profile, error: profileError } = await sbAdmin
    .from('users')
    .select('id, role, approved, first_name, last_name')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    if (profileError?.code && profileError.code !== 'PGRST116') {
      console.error('[AUTH] Profile lookup failed:', {
        code: profileError.code,
        message: profileError.message,
      });
      throw new SessionLoadError('Session could not be loaded.', 500);
    }
    throw new SessionLoadError(
      'Account is not provisioned for this application. Contact an administrator.',
      403,
    );
  }

  if (profile.approved !== true) {
    throw new SessionLoadError('Account pending approval', 403);
  }

  const { data: clientLinks, error: clientLinksError } = await sbAdmin
    .from('user_clients')
    .select('client_id, access_level')
    .eq('user_id', profile.id);

  if (clientLinksError) {
    console.error('[AUTH] Client assignment lookup failed:', {
      code: clientLinksError.code,
      message: clientLinksError.message,
    });
    throw new SessionLoadError('Session could not be loaded.', 500);
  }

  const clientAccess = (clientLinks || [])
    .map((link) => ({
      client_id: Number(link.client_id),
      access_level: link.access_level === 'edit' ? 'edit' : 'read',
    }))
    .filter((entry) => Number.isSafeInteger(entry.client_id) && entry.client_id > 0);

  const firstName = cleanName(profile.first_name);
  const lastName = cleanName(profile.last_name);

  return {
    id: profile.id,
    role: profile.role,
    email: String(email || '').trim().toLowerCase(),
    first_name: firstName,
    last_name: lastName,
    display_name: firstName,
    full_name: [firstName, lastName].filter(Boolean).join(' '),
    approved: true,
    client_ids: clientAccess.map((entry) => entry.client_id),
    client_access: clientAccess,
  };
}

module.exports = {
  buildSessionPayload,
  SessionLoadError,
};
