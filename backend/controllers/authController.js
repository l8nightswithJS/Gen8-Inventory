// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../models/db');
const { JWT_SECRET } = require('../config');

/**
 * POST /api/auth/register
 * Creates a new user (approved=false) pending admin approval.
 */
exports.register = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    // Hash the incoming password
    const hash = bcrypt.hashSync(password, 10);

    // Insert user with approved=false so they land in the pending queue
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hash,
        role,
        approved: false, // ← pending by default
      })
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint on username
        return res.status(400).json({ message: 'Username already exists' });
      }
      throw error;
    }

    // Success message – account is awaiting admin approval now
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

    // Look up the user record by username
    const {
      data: [user],
      error,
    } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1);

    if (error) throw error;

    // Credentials check
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Approval gate
    if (user.approved === false) {
      return res.status(403).json({ message: 'Account pending approval' });
    }

    // Issue JWT for approved users
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
