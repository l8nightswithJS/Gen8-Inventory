require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware, requireClientMatch } = require('shared-auth');

const barcodes = require('./routes/barcodes');
const scan = require('./routes/scan');
const authorizeBarcode = require('./middleware/authorizeBarcode');

const app = express();

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/healthz', (_req, res) => res.json({ service: 'barcode', ok: true }));

app.use(authMiddleware);
app.use(requireClientMatch);
// Mounted at /api so req.path starts with /barcodes/...
app.use('/api', authorizeBarcode);

// Routes
app.use('/api/barcodes', barcodes);
app.use('/api/scan', scan);

const PORT = Number(process.env.PORT) || 8002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Barcode service listening on :${PORT}`);
});
