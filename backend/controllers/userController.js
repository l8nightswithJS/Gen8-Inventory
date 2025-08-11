// backend/controllers/userController.js
const bcrypt = require('bcryptjs');
const supabase = require('../lib/supabaseClient');

// GET /api/users
exports.getAllUsers = async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, approved, created_at')
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
};

// POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { username, password, role = 'staff' } = req.body || {};
    if (!username || !password)
      return res
        .status(400)
        .json({ message: 'username and password are required' });
    const hash = bcrypt.hashSync(String(password), 10);
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: String(username).trim(),
        password: hash,
        role,
        approved: true,
      })
      .select('id, username, role, approved')
      .single();
    if (error) {
      if (error.code === '23505')
        return res.status(400).json({ message: 'Username already exists' });
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const patch = {};
    if (typeof req.body.username === 'string')
      patch.username = req.body.username.trim();
    if (typeof req.body.role === 'string') patch.role = req.body.role;
    if (typeof req.body.approved === 'boolean')
      patch.approved = req.body.approved;
    if (
      typeof req.body.password === 'string' &&
      req.body.password.length >= 6
    ) {
      patch.password = bcrypt.hashSync(String(req.body.password), 10);
    }
    if (Object.keys(patch).length === 0)
      return res.status(400).json({ message: 'No fields to update' });

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', id)
      .select('id, username, role, approved')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const { error, count } = await supabase
      .from('users')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw error;
    if (count === 0) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};
