// controllers/userController.js
const bcrypt   = require('bcryptjs');
const supabase = require('../models/db');

/**
 * GET /api/users
 * List all users (admin only).
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, approved, created_at')
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(users);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/pending
 * List newly registered users awaiting approval.
 */
exports.getPendingUsers = async (req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(users);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * Fetch one user by ID.
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { data: [user], error } = await supabase
      .from('users')
      .select('id, username, role, approved, created_at')
      .eq('id', req.params.id)
      .limit(1);
    if (error) throw error;
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users
 * Create a new user (admin only).
 */
exports.createUser = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    const hash = bcrypt.hashSync(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hash,
        role,
        approved: true  // direct creation by admin is automatically approved
      })
      .single();

    if (error) {
      if (error.code === '23505') {  // unique_violation
        return res.status(400).json({ message: 'Username already exists' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id/approve
 * Approve a pending user.
 */
exports.approveUser = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ approved: true })
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User approved', user: data });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id
 * Update username, password, or role (admin only).
 */
exports.updateUser = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.username) {
      updates.username = req.body.username;
    }
    if (req.body.password) {
      updates.password = bcrypt.hashSync(req.body.password, 10);
    }
    if (req.body.role) {
      updates.role = req.body.role;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ message: 'No changes submitted' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
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

    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Remove a user (admin only).
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};
