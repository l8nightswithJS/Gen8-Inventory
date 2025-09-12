// In inventory-service/server.js (Corrected and Final Version)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const {
  authMiddleware,
  requireRole,
  requireClientMatch,
  errorHandler,
} = require('shared-auth');

// Import the controller directly to access the master view function
const inventoryController = require('./controllers/inventoryController');
const inventoryRouter = require('./routes/inventory');
const labelsRouter = require('./routes/labels');
const locationsRouter = require('./routes/locations');

const app = express();
app.set('etag', false);

// --- Public Routes & Basic Setup ---
app.get('/healthz', (_req, res) =>
  res.json({ service: 'inventory', ok: true }),
);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- Protected Routes ---
app.use('/api/auth/uploads', requireClientMatch, express.static(uploadDir));
// All routes in this service require the user to be logged in.
app.use(authMiddleware);

// The Master View is special: it's admin-only but does NOT get a client match check.
app.get(
  '/api/auth/inventory/by-location',
  requireRole('admin'),
  inventoryController.getMasterInventoryByLocation,
);

// These routers handle client-specific data, so they DO get the client match check.

app.use('/api/auth', requireClientMatch, inventoryRouter);
app.use('/api/auth', requireClientMatch, labelsRouter);
app.use('/api/auth', requireClientMatch, locationsRouter);

// --- Final Setup ---
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Inventory service listening on :${PORT}`);
});
