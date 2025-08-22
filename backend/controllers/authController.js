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

    // Use Supabase Auth for registration. This is much more secure.
    // We create a placeholder email, and store the real username in metadata.
    const { error } = await supabase.auth.signUp({
      email: `${username.trim().toLowerCase()}@inventory.app`, // A unique, consistent email format
      password: password,
      options: {
        data: {
          username: username.trim(),
          role: role,
        },
      },
    });

    if (error) {
      // Handle specific errors from Supabase
      if (error.message.includes('User already registered')) {
        return res.status(409).json({ message: 'Username already exists' });
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
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    // Use Supabase Auth for login.
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: `${username.trim().toLowerCase()}@inventory.app`,
        password: password,
      },
    );

    if (signInError) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // After successful login, check our public.users table for approval status.
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('approved, role, username')
      .eq('id', data.user.id)
      .single();

    if (profileError || !userProfile) {
      // This case can happen if the trigger failed or the user was deleted.
      await supabase.auth.signOut();
      return res.status(401).json({ message: 'User profile not found.' });
    }

    if (userProfile.approved === false) {
      await supabase.auth.signOut(); // Log them out immediately.
      return res.status(403).json({ message: 'Account pending approval' });
    }

    // Return the session token from Supabase.
    res.json({
      token: data.session.access_token,
      role: userProfile.role,
      username: userProfile.username,
    });
  } catch (err) {
    next(err);
  }
};
