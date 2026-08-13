require('dotenv').config();
const express = require('express');
const {
  authMiddleware,
  errorHandler,
  requireInternalGateway,
} = require('shared-auth');

const authRouter = require('./routes/authRoutes');
const usersRouter = require('./routes/users');

const app = express();
app.set('etag', false);
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// Railway health checks stay directly reachable; application APIs do not.
app.get('/healthz', (_req, res) => {
  res.json({ service: 'auth', ok: true });
});

app.use(requireInternalGateway);
app.use('/api/auth', authRouter);
app.use(authMiddleware);
app.use('/api/users', usersRouter);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth service listening on :${PORT}`);
});
