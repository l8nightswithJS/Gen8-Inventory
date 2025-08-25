// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRouter = require('./routes/authRoutes');
const usersRouter = require('./routes/users');
const clientsRouter = require('./routes/clients');
const inventoryRouter = require('./routes/inventory');
const barcodeRoutes = require('./routes/barcodes');
const labelsRouter = require('./routes/labels'); // ⬅️ NEW

const app = express();

// --> ADD THIS CODE BLOCK <--
// Simple route to check API status and deployed version
app.get('/', (req, res) => {
  res.json({
    message: 'Gener8 Inventory API is running.',
    version: '2.0-login-fix',
  });
});
// ------------------------------------

// ... (the rest of your server.js file)

// CORS — keep your original, proven behavior
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
app.use(
  cors({
    origin: FRONTEND_ORIGIN || '*',
    credentials: true,
  }),
);

// Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/items', inventoryRouter);
app.use('/api/barcodes', barcodeRoutes);
app.use('/api/labels', labelsRouter); // ⬅️ NEW

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Error handler (keep last)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ API server listening on :${PORT}`));
