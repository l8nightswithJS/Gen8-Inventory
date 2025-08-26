require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/users');
const authMiddleware = require('./middleware/authMiddleware'); // Import the main auth middleware

const app = express();

app.use(cors());
app.use(express.json());

// Public routes for login and registration
app.use('/api/auth', authRoutes);

// Apply authentication middleware to all routes below this point
app.use(authMiddleware);

// Protected routes for user management
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
