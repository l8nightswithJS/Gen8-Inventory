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
const PORT = Number(RENDER_PORT) || 8080;

if (!AUTH_URL || !INVENTORY_URL || !CLIENT_URL || !BARCODE_URL) {
  console.error('❌ Missing one or more upstream URLs');
  process.exit(1);
}

const app = express();

// --- CORS ---
const allowlist = CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowlist.length === 0 || allowlist.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// Debug log incoming requests
app.use((req, _res, next) => {
  console.log(`[GW] Incoming ${req.method} ${req.originalUrl}`);
  next();
});
app.use(morgan('tiny'));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// --- Proxy helper ---
const prox = (target, options = {}) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 25_000,
    timeout: 25_000,
    logLevel: 'debug', // enable full debug
    onProxyReq(proxyReq, req) {
      console.log(
        `[GW] Proxying ${req.method} ${req.originalUrl} -> ${target}`,
      );
    },
    onError(err, req, res) {
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
    ...options,
  });

// --- Routes ---
app.use('/api/auth', prox(AUTH_URL));
app.use('/api/items', prox(INVENTORY_URL));
app.use('/api/clients', prox(CLIENT_URL));
app.use('/api/barcodes', prox(BARCODE_URL));
app.use('/api/scan', prox(BARCODE_URL));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] listening on ${PORT}`);
});
