require('dotenv').config();
const express = require('express');

const {
  authMiddleware,
  requireRole,
  requireClientMatch,
  requireInternalGateway,
  errorHandler,
} = require('shared-auth');

const masterWarehouseController = require('./controllers/masterWarehouseController');
const inventoryRouter = require('./routes/inventory');
const labelsRouter = require('./routes/labels');
const locationsRouter = require('./routes/locations');
const receivingRouter = require('./routes/receiving');

const app = express();
app.set('etag', false);
app.disable('x-powered-by');

app.get('/healthz', (_req, res) =>
  res.json({ service: 'inventory', ok: true }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(requireInternalGateway);
app.use(authMiddleware);

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
  console.log(`Inventory service listening on :${PORT}`);
});
