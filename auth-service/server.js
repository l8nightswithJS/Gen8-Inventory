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

// Prevent caching
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ service: 'auth', ok: true, timestamp: Date.now() });
});

// --- Auth routes ---
// Gateway forwards /api/auth/* → here as /...
app.use('/verify', authMiddleware);
app.use('/me', authMiddleware);
app.use('/logout', authMiddleware);

// Public routes (login, register)
app.use('/', authRouter);

// --- User management routes ---
// Gateway forwards /api/users/* → here as /api/auth/users/*
app.use('/api/auth/users', authMiddleware, usersRouter);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
