// In auth-service/controllers/userController.js (Complete File)

const { sbAdmin } = require('../lib/supabaseClient');

const handleSupabaseError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
    details: error.message,
  });
};

exports.getAllUsers = async (req, res) => {
  const { data, error } = await sbAdmin
    .from('users')
    .select('id, email, role, approved')
    .order('email', { ascending: true });
  if (error) return handleSupabaseError(res, error, 'getAllUsers');
  res.json(data || []);
};

exports.getPendingUsers = async (req, res) => {
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
  try {
    const { data, error } = await sbAdmin
      .from('user_clients')
      .select('client_id')
      .eq('user_id', id);
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    return handleSupabaseError(res, error, 'getUserClients');
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
  const { role } = req.body;
  const { data, error } = await sbAdmin
    .from('users')
    .update({ role })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'updateUserRole');
  res.json({ message: 'User updated successfully', user: data[0] });
};

exports.updateUserClients = async (req, res) => {
  const { id } = req.params;
  const { client_ids } = req.body;

  if (!Array.isArray(client_ids)) {
    return res.status(400).json({ message: 'client_ids must be an array.' });
  }

  // NOTE: This uses Supabase direct connection, which may not be available.
  // We'll use the standard client which is safer.
  try {
    // Transaction Step 1: Delete old associations
    const { error: deleteError } = await sbAdmin
      .from('user_clients')
      .delete()
      .eq('user_id', id);
    if (deleteError) throw deleteError;

    // Transaction Step 2: Insert new associations if any exist
    if (client_ids.length > 0) {
      const linksToInsert = client_ids.map((clientId) => ({
        user_id: id,
        client_id: clientId,
      }));
      const { error: insertError } = await sbAdmin
        .from('user_clients')
        .insert(linksToInsert);
      if (insertError) throw insertError;
    }

    res.json({ message: `User's client access updated successfully.` });
  } catch (error) {
    return handleSupabaseError(res, error, 'updateUserClients');
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const { error } = await sbAdmin.auth.admin.deleteUser(id);
  if (error) {
    return handleSupabaseError(res, error, 'deleteUser');
  }
  res.status(204).send();
};
