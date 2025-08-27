// server.js (gateway)
import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';

const app = express();
app.set('trust proxy', true); // behind Render's proxy

// Build internal URLs if host+port are provided; otherwise fall back to a public URL
const mk = (host, port, pub) => (host && port ? `http://${host}:${port}` : pub);

const AUTH_URL = mk(
  process.env.AUTH_HOST,
  process.env.AUTH_PORT,
  process.env.AUTH_PUBLIC_URL,
);
const CLIENT_URL = mk(
  process.env.CLIENT_HOST,
  process.env.CLIENT_PORT,
  process.env.CLIENT_PUBLIC_URL,
);
const INVENTORY_URL = mk(
  process.env.INVENTORY_HOST,
  process.env.INVENTORY_PORT,
  process.env.INVENTORY_PUBLIC_URL,
);
const BARCODE_URL = mk(
  process.env.BARCODE_HOST,
  process.env.BARCODE_PORT,
  process.env.BARCODE_PUBLIC_URL,
);

// shared proxy options: fail fast, good logs, proper headers
const opts = (target) => ({
  target,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 12000,
  timeout: 15000,
  onError(err, req, res) {
    console.error('Proxy error:', err.code || err.message, '→', target);
    res
      .status(502)
      .json({ error: 'Upstream unavailable', code: err.code || 'EUPSTREAM' });
  },
});

// wire routes (adjust paths if yours differ)
app.use(
  '/api/auth',
  createProxyMiddleware({
    ...opts(AUTH_URL),
    pathRewrite: { '^/api/auth': '' },
  }),
);
app.use(
  '/api/clients',
  createProxyMiddleware({
    ...opts(CLIENT_URL),
    pathRewrite: { '^/api/clients': '' },
  }),
);
app.use(
  '/api/items',
  createProxyMiddleware({
    ...opts(INVENTORY_URL),
    pathRewrite: { '^/api/items': '' },
  }),
);
app.use(
  '/api/barcodes',
  createProxyMiddleware({
    ...opts(BARCODE_URL),
    pathRewrite: { '^/api/barcodes': '' },
  }),
);

app.get('/healthz', (_, res) => res.send('ok')); // for Render health checks
