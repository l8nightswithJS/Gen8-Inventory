// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Routers
const clientsRouter = require('./routes/clients');
const inventoryRouter = require('./routes/inventory');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/authRoutes');

// Pull PORT straight from env, with a fallback
const PORT = process.env.PORT || 8000;

const app = express();

// CORS & body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/items', inventoryRouter);
app.use('/api/users', usersRouter);

// Error handler (must come *after* all routes)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
