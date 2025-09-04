// auth-service/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/authRoutes');
const usersRouter = require('./routes/users');

const app = express();
app.set('etag', false);

// Make responses uncacheable by browsers/proxies
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

app.use(cors());
app.use(express.json());

// ✅ Public + protected routes are handled *inside* authRoutes
app.use('/api/auth', authRouter);

// ✅ User routes stay protected (apply authMiddleware only here)
const { authMiddleware } = require('shared-auth');
app.use('/api/users', authMiddleware, usersRouter);

const PORT = Number(process.env.PORT) || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
