// auth-service/controllers/userController.js
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

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await sbAdmin
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
  const { data, error } = await sbAdmin
    .from('users')
    .update({ approved: true })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'approveUser');
  res.json({ message: 'User approved successfully', user: data[0] });
};

exports.updateUserRole = async (req, res) => {
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

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const { error } = await sbAdmin.auth.admin.deleteUser(id);
  if (error) {
    return handleSupabaseError(res, error, 'deleteUser');
  }
  res.status(204).send();
};
