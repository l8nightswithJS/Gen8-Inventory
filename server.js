const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const inventoryRoutes = require('./routes/inventory');
const authRoutes = require('./routes/authRoutes');
const clientsRoutes = require('./routes/clients');

const app = express();
app.use(cors());

// Increase payload/body limit for big uploads (CSV, Excel, etc)
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

// Ensure uploads directory exists before using it!
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files (logos, etc.)
app.use('/uploads', express.static(uploadDir));

// API routes
app.use('/api/items', inventoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);

const PORT = 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
