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

const inventoryRouter = require('./routes/inventory');
const labelsRouter = require('./routes/labels');
const locationsRouter = require('./routes/locations');

const app = express();
app.set('etag', false);

// Health endpoint
app.get('/healthz', (_req, res) =>
  res.json({ service: 'inventory', ok: true }),
);

const CORS_ORIGIN = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: CORS_ORIGIN || '*',
    credentials: true,
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/', authMiddleware, inventoryRouter);
app.use('/', authMiddleware, labelsRouter);
app.use(
  '/',
  authMiddleware,
  requireClientMatch,
  requireRole('admin', 'manager'),
  locationsRouter,
);

// Global error handler
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Inventory service listening on :${PORT}`);
});
