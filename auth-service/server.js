require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/authRoutes');
const usersRouter = require('./routes/users');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
app.set('etag', false);
// and make responses uncacheable by browsers/proxies
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

app.use(cors());
app.use(express.json());

/**
 * Protect only the sensitive auth endpoints.
 * NOTE: These MUST be registered BEFORE the /api/auth router
 * so they run for those paths and do NOT affect /login or /register.
 */
app.use('/api/auth/verify', authMiddleware);
app.use('/api/auth/me', authMiddleware);
app.use('/api/auth/logout', authMiddleware);

// Public routes for login and registration + protected ones handled above
app.use('/api/auth', authRouter);

// Apply authentication middleware to all routes below this point
app.use(authMiddleware);

// Protected routes for user management
app.use('/api/users', usersRouter);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
