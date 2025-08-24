// backend/controllers/userController.js
const supabase = require('../lib/supabaseClient');

exports.getAllUsers = async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

exports.updateUser = async (req, res) => {
  // BEFORE: const id = parseInt(req.params.id, 10);
  // AFTER: Treat the ID as a string (UUID)
  const { id } = req.params;
  const { username, role, approved } = req.body;

  const { data, error } = await supabase
    .from('users')
    .update({ username, role, approved })
    .eq('id', id)
    .select(); // Use .select() to get the updated record back

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(data[0]);
};

exports.deleteUser = async (req, res) => {
  // BEFORE: const id = parseInt(req.params.id, 10);
  // AFTER: Treat the ID as a string (UUID)
  const { id } = req.params;

  // We need to delete from auth.users first, which cascades to public.users
  const { error: authError } = await supabase.auth.admin.deleteUser(id);

  if (authError) {
    // If the error is that the user is not found, we can check public.users
    // as it might be an orphaned record.
    const { error: publicError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (publicError) {
      return res.status(500).json({ error: publicError.message });
    }
  }

  res.status(204).send(); // 204 No Content is standard for a successful delete
};

exports.approveUser = async (req, res) => {
  // BEFORE: const id = parseInt(req.params.id, 10);
  // AFTER: Treat the ID as a string (UUID)
  const { id } = req.params;

  const { data, error } = await supabase
    .from('users')
    .update({ approved: true })
    .eq('id', id)
    .select(); // Use .select() to confirm the update

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ message: 'User approved', user: data[0] });
};
