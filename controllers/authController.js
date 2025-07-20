// controllers/authController.js
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcryptjs');
const supabase  = require('../models/db');
const { JWT_SECRET } = require('../config');

exports.register = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    // hash & insert with approved=false
    const hash = bcrypt.hashSync(password, 10);
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hash,
        role,
        approved: false
      })
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Username already exists' });
      }
      throw error;
    }
    // success: let them know request is pending
    res
      .status(201)
      .json({ message: 'Registration submitted – awaiting admin approval.' });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const { data: [user], error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1);

    if (error) throw error;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    if (!user.approved) {
      return res.status(403).json({ message: 'Account pending approval' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    next(err);
  }
};
