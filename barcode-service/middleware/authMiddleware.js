//barcode-service/middleware/authMiddleware.js
const axios = require('axios');

module.exports = async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/api/auth/verify`,
      { token },
    );
    if (response.data && response.data.user) {
      req.user = response.data.user;
      next();
    } else {
      throw new Error('Invalid token');
    }
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
