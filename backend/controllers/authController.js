// backend/controllers/authController.js
const supabase = require('../lib/supabaseClient');

exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  // Input validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (authError) {
    return res.status(400).json({ message: authError.message });
  }

  if (!authData.user) {
    return res
      .status(500)
      .json({ message: 'Registration successful, but no user data returned.' });
  }

  // Insert into public.users table
  const { error: publicError } = await supabase.from('users').insert({
    id: authData.user.id,
    username,
    // BEFORE: role: req.body.role || 'staff',
    // AFTER: Always default new users to 'staff' for security.
    role: 'staff',
    approved: false, // Ensure users are not approved by default
  });

  if (publicError) {
    // If this fails, we should ideally delete the auth user to prevent orphans
    await supabase.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({ message: publicError.message });
  }

  res.status(201).json({
    message: 'User registered successfully. Please wait for admin approval.',
    user: authData.user,
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ message: error.message });
  }

  // Check if the user is approved in our public.users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('approved, role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !userProfile) {
    return res
      .status(401)
      .json({ message: 'User profile not found or error fetching it.' });
  }

  if (!userProfile.approved) {
    return res
      .status(403)
      .json({ message: 'Account not approved by an administrator yet.' });
  }

  res.json({
    message: 'Login successful',
    user: data.user,
    session: data.session,
    role: userProfile.role, // Send the user's role to the frontend
  });
};
