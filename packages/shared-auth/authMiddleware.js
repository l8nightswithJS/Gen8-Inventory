const verifyJwt = require('./verifyJwt');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res
      .status(401)
      .json({ error: 'Invalid Authorization header format' });
  }

  try {
    const user = verifyJwt(token);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: ' + err.message });
  }
}

module.exports = authMiddleware;
