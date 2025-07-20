// controllers/userController.js
// … existing imports

// GET /api/users/pending
exports.getPendingUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id/approve
exports.approveUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { data, error } = await supabase
      .from('users')
      .update({ approved: true })
      .eq('id', userId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User approved', user: data });
  } catch (err) {
    next(err);
  }
};
