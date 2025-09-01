const { authMiddleware, requireRole, requireClientMatch } = require('shared-auth');
// barcode-service/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const barcodeRoutes = require('./routes/barcodes');
const scanRouter = require('./routes/scan');

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Protect API routes (except health)
app.use('/api', authMiddleware);

// Secure all routes in this service
app.use(authMiddleware);

app.use('/api/barcodes', barcodeRoutes);
app.use('/api/scan', scanRouter);

const PORT = Number(process.env.PORT) || 8002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Barcode service listening on :${PORT}`);
});
