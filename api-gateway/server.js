// api-gateway/server.js (Complete and Verified)
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import Agent from 'agentkeepalive';

const {
  PORT: RENDER_PORT,
  CORS_ORIGIN = '',
  AUTH_URL,
  INVENTORY_URL,
  CLIENT_URL,
  BARCODE_URL,
} = process.env;
const PORT = Number(RENDER_PORT) || 8080;

const app = express();

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
app.use(express.json());

const prox = (target, options = {}) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: 'debug',
    // ADD THIS to re-stream the request body
    onProxyReq: (proxyReq, req, res) => {
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    // ADD THIS for robust connection handling
    agent: new Agent({
      maxSockets: 100,
      keepAlive: true,
      maxFreeSockets: 10,
      timeout: 60000,
      freeSocketTimeout: 30000,
    }),
    onError: (err, req, res) => {
      console.error('[HPM] PROXY ERROR:', err);
    },
    ...options,
  });

app.use(morgan('tiny'));
// --- Routes ---

// Auth service (login, register, etc.) -> Proxies /api/auth to /
app.use('/api/auth', prox(AUTH_URL, { pathRewrite: { '^/api/auth': '' } }));

// User management -> Proxies /api/users to /users
app.use(
  '/api/users',
  prox(AUTH_URL, { pathRewrite: { '^/api/users': '' } }), // <-- THIS IS THE CRITICAL LINE
);

// Inventory service -> Proxies /api/items to /items
app.use(
  '/api/items',
  prox(INVENTORY_URL, { pathRewrite: { '^/api/items': '/items' } }),
);

// ADD THIS NEW RULE for the master inventory view
app.use(
  '/api/inventory',
  prox(INVENTORY_URL, { pathRewrite: { '^/api/inventory': '' } }),
);

// Client service -> Proxies /api/clients to /
app.use(
  '/api/clients',
  prox(CLIENT_URL, { pathRewrite: { '^/api/clients': '/clients' } }),
);

// Barcode service
app.use(
  '/api/barcodes',
  prox(BARCODE_URL, { pathRewrite: { '^/api/barcodes': '/barcodes' } }),
);
app.use(
  '/api/scan',
  prox(BARCODE_URL, { pathRewrite: { '^/api/scan': '/scan' } }),
);

// Health check
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Catch-all 404
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] API Gateway listening on port ${PORT}`);
});
