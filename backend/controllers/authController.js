// backend/controllers/authController.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../lib/supabaseClient');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('🚨 Missing JWT_SECRET environment variable');
}

exports.register = async (req, res, next) => {
  try {
    const { username, password, role = 'staff' } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'username and password are required' });
    }
    const hash = bcrypt.hashSync(String(password), 10);
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: String(username).trim(),
        password: hash,
        role,
        approved: false,
      })
      .select('id, username, role, approved')
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Username already exists' });
      }
      throw error;
    }
    res
      .status(201)
      .json({
        message: 'Registration received. Awaiting approval.',
        user: data,
      });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'username and password are required' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password, role, approved')
      .eq('username', String(username).trim())
      .single();
    if (error) throw error;
    if (!user || !bcrypt.compareSync(String(password), user.password)) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    if (user.approved === false) {
      return res.status(403).json({ message: 'Account pending approval' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '8h' },
    );
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    next(err);
  }
};
