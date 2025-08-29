const { sbAuth } = require('../lib/supabaseClient');

const handleSupabaseError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({
    message: `Internal server error during ${context}`,
    details: error.message,
  });
};

exports.getAllUsers = async (req, res) => {
  const { data, error } = await sbAuth
    .from('users')
    .select('id, username, role, approved')
    .order('username', { ascending: true });
  if (error) throw error;
  res.json(data || []);
};

exports.getPendingUsers = async (req, res) => {
  const { data, error } = await sbAuth
    .from('users')
    .select('id, username, role, approved')
    .eq('approved', false)
    .order('username', { ascending: true });
  if (error) throw error;
  res.json(data || []);
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await sbAuth
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return handleSupabaseError(res, error, 'getUserById');
  if (!data) return res.status(404).json({ message: 'User not found' });
  res.json(data);
};

exports.approveUser = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await sbAuth
    .from('users')
    .update({ approved: true })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'approveUser');
  res.json({ message: 'User approved successfully', user: data[0] });
};

// RENAMED and UPDATED this function
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // Only handles role updates
  const { data, error } = await sbAuth
    .from('users')
    .update({ role })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'updateUserRole');
  res.json({ message: 'User updated successfully', user: data[0] });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  // This will delete the user from auth.users and cascade to public.users
  const { error } = await sbAuth.auth.admin.deleteUser(id);
  if (error) {
    return handleSupabaseError(res, error, 'deleteUser');
  }
  res.status(204).send();
};
