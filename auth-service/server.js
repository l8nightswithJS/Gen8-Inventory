// auth-service/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// ✅ Use shared-auth middleware instead of local one
const { authMiddleware } = require('shared-auth');

const authRouter = require('./routes/authRoutes');
const usersRouter = require('./routes/users');

const app = express();
app.set('etag', false);

// make responses uncacheable by browsers/proxies
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

app.use(cors());
app.use(express.json());

/**
 * 🔎 Health check (path corrected to match gateway's path rewrite)
 */
app.get('/healthz', (_req, res) => {
  res.json({ service: 'auth', ok: true, timestamp: Date.now() });
});

/**
 * Protect sensitive auth endpoints first.
 * The gateway strips "/api/auth", so we listen for the resulting path (e.g., "/verify").
 */
app.use('/verify', authMiddleware);
app.use('/me', authMiddleware);
app.use('/logout', authMiddleware);

// Public routes like /login and /register are handled by this router.
// This is placed after the specific middleware above to ensure they are protected first.
app.use('/', authRouter);

// Protected routes for user management.
// The gateway rewrites "/api/users" to "/api/auth/users".
app.use('/api/auth/users', authMiddleware, usersRouter);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
