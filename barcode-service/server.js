require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('shared-auth');

const barcodeRoutes = require('./routes/barcodes');
const scanRouter = require('./routes/scan');

const app = express();

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/healthz', (_req, res) => res.json({ service: 'barcode', ok: true }));

// Routes
app.use('/api/auth/barcodes', authMiddleware, barcodeRoutes);
app.use('/api/auth/scan', authMiddleware, scanRouter);

const PORT = Number(process.env.PORT) || 8002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Barcode service listening on :${PORT}`);
});
