require('dotenv').config();
const express = require('express');
const cors = require('cors');

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
const receivingRouter = require('./routes/receiving');

const app = express();
app.set('etag', false);

// Enable CORS before health routes so browser clients can reach the service consistently.
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));

app.get('/healthz', (_req, res) =>
  res.json({ service: 'inventory', ok: true }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// Warehouse-wide master view is admin-only and intentionally not client-scoped.
app.get(
  '/api/inventory/by-location',
  requireRole('admin'),
  masterWarehouseController.getMasterInventoryByLocation,
);

app.use('/api/locations', requireRole('admin'), locationsRouter);
app.use('/api/receiving', receivingRouter);

app.use('/api/items', requireClientMatch, inventoryRouter);
app.use('/api/inventory', requireClientMatch, inventoryRouter);
app.use('/api/labels', requireClientMatch, labelsRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Inventory service listening on :${PORT}`);
});
