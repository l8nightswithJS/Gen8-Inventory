const bcrypt = require('bcryptjs');
const db = require('../models/db');

// GET /api/users
exports.getAllUsers = (req, res, next) => {
  try {
    const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id
exports.getUserById = (req, res, next) => {
  try {
    const user = db
      .prepare('SELECT id, username, role, created_at FROM users WHERE id = ?')
      .get(req.params.id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// POST /api/users
exports.createUser = (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
      .run(username, hash, role);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      err.statusCode = 400;
      err.message = 'Username already exists';
    }
    next(err);
  }
};

// PUT /api/users/:id
exports.updateUser = (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    // build dynamic setter
    const updates = [];
    const params = [];
    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    if (password) {
      updates.push('password = ?');
      params.push(bcrypt.hashSync(password, 10));
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (updates.length === 0) {
      return res.json({ message: 'No changes submitted' });
    }
    params.push(req.params.id);
    const stmt = db.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    );
    const info = stmt.run(...params);
    if (info.changes === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json({ message: 'User updated' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      err.statusCode = 400;
      err.message = 'Username already exists';
    }
    next(err);
  }
};

// DELETE /api/users/:id
exports.deleteUser = (req, res, next) => {
  try {
    const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};
