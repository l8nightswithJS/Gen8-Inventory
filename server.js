// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const clientsRouter = require('./routes/clients');
const inventoryRouter = require('./routes/inventory');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/authRoutes');
const { PORT } = require('./config');

const app = express();
const port = PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/items', inventoryRouter);
app.use('/api/users', usersRouter);

// Centralized error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});

// Note: Table creation must be handled via Supabase SQL migrations or manual setup
