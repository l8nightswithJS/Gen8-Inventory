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
 * Protect only sensitive auth endpoints.
 * These MUST be registered BEFORE /api/auth router
 * so they don’t affect /login or /register.
 */
app.use('/api/auth/verify', authMiddleware);
app.use('/api/auth/me', authMiddleware);
app.use('/api/auth/logout', authMiddleware);

// Public routes for login/register + protected ones handled above
app.use('/api/auth', authRouter);

// Apply authentication middleware globally below this point
app.use(authMiddleware);

// Protected routes for user management
app.use('/api/users', usersRouter);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
