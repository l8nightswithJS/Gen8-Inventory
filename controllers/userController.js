const db = require('../models/db');
const bcrypt = require('bcryptjs');

// Get all users
exports.getAllUsers = (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id DESC').all();
  res.json(users);
};

// Get a single user
exports.getUserById = (req, res) => {
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

// Create new user
exports.createUser = (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password and role are required' });
  }

  const hash = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)'
    ).run(username, hash, role);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user (including optional password)
exports.updateUser = (req, res) => {
  const { username, password, role } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const newPass = password ? bcrypt.hashSync(password, 10) : user.password;

  db.prepare(
    'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?'
  ).run(username || user.username, newPass, role || user.role, req.params.id);

  res.json({ message: 'User updated' });
};

// Delete user
exports.deleteUser = (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
};
