require('dotenv').config();
const express = require('express');
const {
  authMiddleware,
  errorHandler,
  requireClientMatch,
  requireInternalGateway,
} = require('shared-auth');

const barcodes = require('./routes/barcodes');
const scan = require('./routes/scan');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.get('/healthz', (_req, res) => res.json({ service: 'barcode', ok: true }));

app.use(requireInternalGateway);
app.use(authMiddleware);
app.use(requireClientMatch);
app.use('/api/barcodes', barcodes);
app.use('/api/scan', scan);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Barcode service listening on :${PORT}`);
});
