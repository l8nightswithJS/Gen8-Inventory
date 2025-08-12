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

const app = express();

/**
 * CORS
 * - If FRONTEND_ORIGIN is provided, it can be a single origin or a comma-separated list.
 * - If not provided, we mirror the request origin (origin: true) so dev + prod just work.
 * - credentials: true retained to match your current config.
 */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const allowlist = FRONTEND_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowlist.length
    ? (origin, cb) => {
        // allow no-origin (curl/health checks) and any in the allowlist
        if (!origin || allowlist.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      }
    : true, // mirror request origin when no env is set
  credentials: true,
};

app.use(cors(corsOptions));

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

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Error handler (keep last)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ API server listening on :${PORT}`));
