//  inventory-service/middleware/authMiddleware.js
const axios = require('axios');

module.exports = async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    // Call the auth service to verify the token
    const response = await axios.post(
      `${process.env.AUTH_PUBLIC_URL}/api/auth/verify`,
      { token },
    );

    // If verification is successful, the auth service returns the user data.
    // Attach the user to the request object.
    if (response.data && response.data.user) {
      req.user = response.data.user;
      next();
    } else {
      throw new Error('Invalid token');
    }
  } catch (error) {
    // If the auth service returns an error (e.g., 401), it means the token is invalid.
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
