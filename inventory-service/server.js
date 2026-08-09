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

const masterWarehouseController = require('./controllers/masterWarehouseController');
const inventoryRouter = require('./routes/inventory');
const labelsRouter = require('./routes/labels');
const locationsRouter = require('./routes/locations');

const app = express();
app.set('etag', false);

// CORS must be enabled before public health routes so the browser can wake
// sleeping Render services directly during login.
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));

app.get('/healthz', (_req, res) =>
  res.json({ service: 'inventory', ok: true }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use('/api/uploads', requireClientMatch, express.static(uploadDir));
app.use(authMiddleware);

// Warehouse-wide master view is admin-only and intentionally not client-scoped.
app.get(
  '/api/inventory/by-location',
  requireRole('admin'),
  masterWarehouseController.getMasterInventoryByLocation,
);

app.use('/api/locations', requireRole('admin'), locationsRouter);

app.use('/api/items', requireClientMatch, inventoryRouter);
app.use('/api/inventory', requireClientMatch, inventoryRouter);
app.use('/api/labels', requireClientMatch, labelsRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Inventory service listening on :${PORT}`);
});
