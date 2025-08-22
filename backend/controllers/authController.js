// backend/controllers/authController.js
const supabase = require('../lib/supabaseClient');

exports.register = async (req, res, next) => {
  try {
    const { username, password, role = 'staff' } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const { error } = await supabase.auth.signUp({
      email: `${username.trim().toLowerCase()}@inventory.app`,
      password: password,
      options: {
        data: {
          username: username.trim(),
          role: role,
        },
      },
    });

    if (error) {
      // Add a specific check for rate-limiting errors (status 429)
      if (error.status === 429) {
        return res
          .status(429)
          .json({
            message: 'Too many requests. Please wait a minute and try again.',
          });
      }
      if (error.message.includes('User already registered')) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      // Pass other unexpected errors to the main error handler
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
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: `${username.trim().toLowerCase()}@inventory.app`,
        password: password,
      },
    );

    if (signInError) {
      // Also handle rate limiting on login for better user feedback
      if (signInError.status === 429) {
        return res
          .status(429)
          .json({
            message:
              'Too many login attempts. Please wait a minute and try again.',
          });
      }
      return res.status(401).json({ message: 'Invalid username or password' });
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

    res.json({
      token: data.session.access_token,
      role: userProfile.role,
      username: userProfile.username,
    });
  } catch (err) {
    next(err);
  }
};
