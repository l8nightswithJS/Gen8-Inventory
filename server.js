const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Serve uploaded files (used by frontend for logos, etc.)
app.use('/uploads', express.static(uploadPath));

// ✅ Routes
app.use('/api/auth', require('./routes/authRoutes')); // <-- This was missing
app.use('/api/clients', require('./routes/clients'));
app.use('/api/items', require('./routes/inventory')); // or './routes/items' if named that
app.use('/api/users', require('./routes/users'));

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
