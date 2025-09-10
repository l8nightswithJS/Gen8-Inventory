// In auth-service/server.js (Corrected and Final Version)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware, requireClientMatch } = require('shared-auth');

const authRouter = require('./routes/authRoutes');
const usersRouter = require('./routes/users');

const app = express();
app.set('etag', false);

app.use(cors());
app.use(express.json());

// --- Public Routes ---
// Health check and public authentication routes (login, register) are mounted FIRST,
// before any security middleware is applied.
app.get('/healthz', (_req, res) => {
  res.json({ service: 'auth', ok: true, timestamp: Date.now() });
});
app.use('/', authRouter);

// --- Security Middleware ---
// Any router mounted AFTER these lines will be protected.
// 1. Checks for a valid token and adds req.user.
app.use(authMiddleware);
// 2. Checks that the user is allowed to access the requested client ID.
app.use(requireClientMatch);

// --- Protected Routes ---
// The usersRouter is now mounted at the /users path and automatically
// inherits the security middleware from above.
app.use('/users', usersRouter);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
