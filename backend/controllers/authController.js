// controllers/authController.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../lib/supabaseClient');

// Read the JWT secret directly from the environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('🚨 Missing JWT_SECRET environment variable!');
  // Optionally throw here to crash early:
  // throw new Error('Missing JWT_SECRET')
}

/**
 * POST /api/auth/register
 * Creates a new user (approved=false) pending admin approval.
 */
exports.register = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    const hash = bcrypt.hashSync(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hash,
        role,
        approved: false, // pending by default
      })
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Username already exists' });
      }
      throw error;
    }

    return res
      .status(201)
      .json({ message: 'Registration submitted – awaiting admin approval.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticates only approved users.
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const {
      data: [user],
      error,
    } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1);

    if (error) throw error;

    if (!user || !bcrypt.compareSync(password, user.password)) {
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

    return res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    next(err);
  }
};
