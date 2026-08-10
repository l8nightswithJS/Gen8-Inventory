const { sbAdmin } = require('../lib/supabaseClient');

const ROLES = ['admin', 'inventory_staff', 'project_user', 'external_viewer'];
const ACCESS_LEVELS = ['read', 'edit'];

const handleSupabaseError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
    details: error.message,
  });
};

function normalizeAssignments(value) {
  if (!Array.isArray(value)) return [];

  const assignments = new Map();
  for (const entry of value) {
    const clientId = Number(
      typeof entry === 'object' && entry !== null ? entry.client_id : entry,
    );
    const accessLevel =
      typeof entry === 'object' && entry !== null
        ? entry.access_level || 'edit'
        : 'edit';

    if (!Number.isSafeInteger(clientId) || clientId < 1) continue;
    if (!ACCESS_LEVELS.includes(accessLevel)) continue;
    assignments.set(clientId, accessLevel);
  }

  return [...assignments.entries()].map(([client_id, access_level]) => ({
    client_id,
    access_level,
  }));
}

async function replaceUserAssignments(userId, assignments) {
  const normalized = normalizeAssignments(assignments);

  const { error: deleteError } = await sbAdmin
    .from('user_clients')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (normalized.length === 0) return;

  const { error: insertError } = await sbAdmin.from('user_clients').insert(
    normalized.map((entry) => ({
      user_id: userId,
      client_id: entry.client_id,
      access_level: entry.access_level,
    })),
  );
  if (insertError) throw insertError;
}

exports.getAllUsers = async (_req, res) => {
  const { data, error } = await sbAdmin
    .from('users')
    .select('id, email, role, approved')
    .order('email', { ascending: true });
  if (error) return handleSupabaseError(res, error, 'getAllUsers');
  res.json(data || []);
};

exports.getPendingUsers = async (_req, res) => {
  const { data, error } = await sbAdmin
    .from('users')
    .select('id, email, role, approved')
    .eq('approved', false)
    .order('email', { ascending: true });
  if (error) return handleSupabaseError(res, error, 'getPendingUsers');
  res.json(data || []);
};

exports.getUserClients = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await sbAdmin
    .from('user_clients')
    .select('client_id, access_level')
    .eq('user_id', id)
    .order('client_id', { ascending: true });
  if (error) return handleSupabaseError(res, error, 'getUserClients');
  return res.json(data || []);
};

exports.createUser = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const role = req.body?.role || 'project_user';
  const assignedClients = req.body?.assigned_clients || [];

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  let createdAuthUser = null;
  try {
    const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError || !authData?.user) throw authError || new Error('User creation failed');
    createdAuthUser = authData.user;

    const { error: profileError } = await sbAdmin.from('users').insert({
      id: createdAuthUser.id,
      email,
      role,
      approved: true,
    });
    if (profileError) throw profileError;

    await replaceUserAssignments(createdAuthUser.id, assignedClients);

    return res.status(201).json({
      id: createdAuthUser.id,
      email,
      role,
      approved: true,
    });
  } catch (error) {
    if (createdAuthUser?.id) {
      try {
        await sbAdmin.auth.admin.deleteUser(createdAuthUser.id);
      } catch {}
    }
    return handleSupabaseError(res, error, 'createUser');
  }
};

exports.approveUser = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await sbAdmin
    .from('users')
    .update({ approved: true })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'approveUser');
  res.json({ message: 'User approved successfully', user: data[0] });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { role, assigned_clients: assignedClients } = req.body;

  if (id === req.user?.id && role && role !== 'admin') {
    return res.status(400).json({
      message: 'Administrators cannot remove their own administrator role.',
    });
  }

  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  try {
    let updatedUser = null;
    if (role) {
      const { data, error } = await sbAdmin
        .from('users')
        .update({ role })
        .eq('id', id)
        .select('id, email, role, approved')
        .single();
      if (error) throw error;
      updatedUser = data;
    }

    if (Array.isArray(assignedClients)) {
      await replaceUserAssignments(id, assignedClients);
    }

    if (!updatedUser) {
      const { data, error } = await sbAdmin
        .from('users')
        .select('id, email, role, approved')
        .eq('id', id)
        .single();
      if (error) throw error;
      updatedUser = data;
    }

    return res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    return handleSupabaseError(res, error, 'updateUser');
  }
};

exports.updateUserClients = async (req, res) => {
  const { id } = req.params;
  const assignments = req.body?.assignments || req.body?.client_ids || [];

  try {
    await replaceUserAssignments(id, assignments);
    return res.json({ message: "User's project access updated successfully." });
  } catch (error) {
    return handleSupabaseError(res, error, 'updateUserClients');
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  if (id === req.user?.id) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  const { error } = await sbAdmin.auth.admin.deleteUser(id);
  if (error) return handleSupabaseError(res, error, 'deleteUser');
  return res.status(204).send();
};
