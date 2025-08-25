// backend/controllers/userController.js
const supabase = require('../lib/supabaseClient');

const handleSupabaseError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res
    .status(500)
    .json({
      message: `Internal server error during ${context}`,
      details: error.message,
    });
};

exports.getAllUsers = async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('approved', true);
  if (error) return handleSupabaseError(res, error, 'getAllUsers');
  res.json(data || []);
};

exports.getPendingUsers = async (req, res) => {
  // FIX: Query for the boolean 'false', not the string 'false'
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('approved', false);
  if (error) return handleSupabaseError(res, error, 'getPendingUsers');
  res.json(data || []);
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('users')
    .update({ approved: true })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'approveUser');
  res.json({ message: 'User approved successfully', user: data[0] });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, role } = req.body;
  const { data, error } = await supabase
    .from('users')
    .update({ username, role })
    .eq('id', id)
    .select();
  if (error) return handleSupabaseError(res, error, 'updateUser');
  res.json({ message: 'User updated successfully', user: data[0] });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.auth.admin.deleteUser(id);
  // Also delete from public.users table as a fallback
  if (error) {
    const { error: publicError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (publicError) return handleSupabaseError(res, publicError, 'deleteUser');
  }
  res.status(204).send();
};
