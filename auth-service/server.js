require('dotenv').config();
const express = require('express');
const cors = require('cors');
import authRouter from './routes/authRoutes.js';
import usersRouter from './routes/users.js';
import authMiddleware from './middleware/authMiddleware'; // Import the main auth middleware

const app = express();

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
