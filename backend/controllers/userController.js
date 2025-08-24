// backend/controllers/userController.js
const supabase = require('../lib/supabaseClient');

/**
 * GET /api/users - List all APPROVED users.
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, approved, created_at')
      .eq('approved', true)
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(users || []);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/pending - List newly registered users awaiting approval.
 */
exports.getPendingUsers = async (req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(users || []);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id - Fetch one user by ID.
 */
exports.getUserById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, approved, created_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/:id/approve - Approve a pending user.
 */
exports.approveUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase
      .from('users')
      .update({ approved: true })
      .eq('id', id)
      .eq('approved', false)
      .select('id, username, role, approved, created_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res
        .status(404)
        .json({ message: 'User not found or already approved' });
    }
    res.json({ message: 'User approved', user: data });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id - Update username or role (NOT password).
 */
exports.updateUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.body.role) updates.role = req.body.role;

    if (Object.keys(updates).length === 0) {
      const { data: currentUser, error: currentError } = await supabase
        .from('users')
        .select('id, username, role, approved, created_at')
        .eq('id', id)
        .single();
      if (currentError) throw currentError;
      return res.json({ message: 'No changes submitted', user: currentUser });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, username, role, approved, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Username already exists' });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated', user: data });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id - Remove a user.
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { error, count } = await supabase
      .from('users')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw error;

    if (count === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};
