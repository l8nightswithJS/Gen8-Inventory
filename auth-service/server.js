// In auth-service/server.js
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
// Health check and public authentication routes (login, register) are mounted FIRST.
app.get('/healthz', (_req, res) => {
  res.json({ service: 'auth', ok: true, timestamp: Date.now() });
});
app.use('/api/auth', authRouter);

// --- Security Middleware ---
// Any router mounted AFTER these lines will be protected.
app.use(authMiddleware);

// --- Protected Routes ---
// The usersRouter is mounted at the /users path and inherits the security.
app.use('/api/auth', usersRouter);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
