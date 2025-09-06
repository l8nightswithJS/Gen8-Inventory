// barcode-service/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('shared-auth');

const barcodeRoutes = require('./routes/barcodes');
const scanRouter = require('./routes/scan');

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Protect API routes (except health)

// Routes
app.use('/api/barcodes', authMiddleware, barcodeRoutes);
app.use('/api/scan', authMiddleware, scanRouter);

// Health endpoint
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT) || 8002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Barcode service listening on :${PORT}`);
});
