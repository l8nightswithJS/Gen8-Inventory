// auth-service/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { authMiddleware } = require('shared-auth');

const authRouter = require('./routes/authRoutes');
const usersRouter = require('./routes/users');

const app = express();
app.set('etag', false);

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
app.use('/verify', authMiddleware);
app.use('/me', authMiddleware);
app.use('/logout', authMiddleware);

// Public routes (login, register)

app.use(
  '/users',
  (req, res, next) => {
    console.log(`[AUTH-SVC] Incoming ${req.method} ${req.originalUrl}`);
    next();
  },
  authMiddleware,
  usersRouter,
);
// --- User management routes ---
// Gateway rewrites /api/users/* -> here as /users/*
app.use('/users', authMiddleware, usersRouter);
app.use('/', authRouter);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
