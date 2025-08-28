const axios = require('axios');

const AUTH_URL = process.env.AUTH_SERVICE_URL || process.env.AUTH_PUBLIC_URL;

if (!AUTH_URL) {
  console.warn(
    '[AUTH MW] AUTH_SERVICE_URL/AUTH_PUBLIC_URL not set. Auth calls will fail.',
  );
}

module.exports = async function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return res.status(401).json({ message: 'Missing token' });
  }
  const token = m[1];

  if (!AUTH_URL) {
    return res.status(502).json({ message: 'Auth service unavailable' });
  }

  try {
    const rsp = await axios.post(
      `${AUTH_URL.replace(/\/+$/, '')}/api/auth/verify`,
      { token },
      { timeout: 8000 },
    );

    if (rsp?.data?.user) {
      req.user = rsp.data.user; // pass through the decoded user
      return next();
    }
    return res.status(401).json({ message: 'Invalid token' });
  } catch (err) {
    if (err.response) {
      // The auth-service responded (e.g., 401/403 with a JSON body)
      const code = err.response.status || 401;
      const msg = err.response.data?.message || 'Unauthorized';
      return res.status(code).json({ message: msg });
    }
    // Network/DNS/timeout to auth-service
    console.error('[AUTH MW] verify call failed:', err.code || err.message);
    return res.status(502).json({
      message: 'Auth service unreachable',
      code: err.code || 'EUPSTREAM',
    });
  }
};
