// gateway/server.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const {
  PORT: RENDER_PORT,
  CORS_ORIGIN = '',
  AUTH_URL,
  INVENTORY_URL,
  CLIENT_URL,
  BARCODE_URL,
} = process.env;
const PORT = Number(RENDER_PORT) || 8080; // numeric, falls back locally

if (!AUTH_URL || !INVENTORY_URL || !CLIENT_URL || !BARCODE_URL) {
  // Fail fast if any upstream is missing
  // eslint-disable-next-line no-console
  console.error(
    'Missing one or more upstream URLs (AUTH_URL, INVENTORY_URL, CLIENT_URL, BARCODE_URL)',
  );
  process.exit(1);
}

const app = express();

// CORS: comma-separated domains in CORS_ORIGIN
const allowlist = CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowlist.length === 0 || allowlist.includes(origin))
        return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(morgan('tiny'));
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Centralized proxy helper with robust error handling
const prox = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 25_000,
    timeout: 25_000,
    onError(err, req, res) {
      // eslint-disable-next-line no-console
      console.error(
        `[GW] Upstream error ${req.method} ${req.originalUrl} -> ${target}:`,
        err?.code || err?.message,
      );
      if (!res.headersSent) {
        res.status(502).json({
          error: 'EUPSTREAM',
          detail: err?.code || 'Upstream unavailable',
        });
      }
    },
  });

// Auth service
app.use('/api/auth', prox(AUTH_URL));

// Core services
app.use('/api/items', prox(INVENTORY_URL));
app.use('/api/clients', prox(CLIENT_URL));
app.use('/api/barcodes', prox(BARCODE_URL));

// 🔧 passthrough for scan so the frontend never needs a second base URL
app.use('/api/scan', prox(BARCODE_URL));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] listening on ${PORT}`);
});
