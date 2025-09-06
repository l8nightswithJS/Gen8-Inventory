// inventory-service/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Shared auth middlewares (from packages/shared-auth)
const {
  authMiddleware,
  requireRole,
  requireClientMatch,
  handleValidation,
  errorHandler,
} = require('shared-auth');

// Core routes
const inventoryRouter = require('./routes/inventory');
const labelsRouter = require('./routes/labels');
const locationsRouter = require('./routes/locations');

const app = express();

app.get('/', (req, res) => {
  res.json({
    message: 'Gener8 Inventory API is running.',
    version: '2.0-login-fix',
  });
});

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
app.use(
  cors({
    origin: FRONTEND_ORIGIN || '*',
    credentials: true,
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/', express.static(uploadDir));

/**
 * 🔐 Protect all /api routes with JWT
 * - Use requireClientMatch + requireRole inside routers where needed
 */

// Routes
app.use('/', authMiddleware, inventoryRouter);
app.use('/', authMiddleware, labelsRouter); // example: labels may not need tenant scoping
app.use(
  '/',
  authMiddleware,
  requireClientMatch,
  requireRole('admin', 'manager'),
  locationsRouter,
);

// Health endpoint (public)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Global error handler
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Inventory service listening on :${PORT}`);
});
