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

// Public routes for login and registration
app.use('/api/auth', authRouter);

// Apply authentication middleware to all routes below this point
app.use(authMiddleware);

// Protected routes for user management
app.use('/api/users', usersRouter);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
