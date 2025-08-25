const supabase = require('../lib/supabaseClient');
const jwt = require('jsonwebtoken');

exports.register = async (req, res, next) => {
  try {
    const { email, password, role = 'staff' } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    // Extract a username from the email (part before the '@')
    const username = email.split('@')[0];

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          username: username, // Save username to metadata
          role: role,
        },
      },
    });

    if (error) {
      if (error.status === 429) {
        return res.status(429).json({
          message: 'Too many requests. Please wait a minute and try again.',
        });
      }
      if (error.message.includes('User already registered')) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      return next(error);
    }

    res
      .status(201)
      .json({ message: 'Registration received. Awaiting approval.' });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password.' });
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: email.trim().toLowerCase(),
        password: password,
      },
    );

    if (signInError) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('approved, role, username')
      .eq('id', data.user.id)
      .single();

    if (profileError || !userProfile) {
      await supabase.auth.signOut();
      return res.status(401).json({ message: 'User profile not found.' });
    }

    if (userProfile.approved === false) {
      await supabase.auth.signOut();
      return res.status(403).json({ message: 'Account pending approval' });
    }

    // Create our own session token
    const appToken = jwt.sign(
      { id: data.user.id, role: userProfile.role, email: data.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.json({
      token: appToken,
      role: userProfile.role,
      username: userProfile.username,
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyToken = (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
