// api-gateway/server.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';

// ---------- helpers ----------
const buildInternalURL = (host, port) =>
  host && port ? `http://${host}:${port}` : undefined;

const chooseTarget = (name, host, port, publicUrl, required = true) => {
  const internal = buildInternalURL(host, port);
  const target = internal || publicUrl;
  if (!target && required) {
    console.error(
      `[BOOT] Missing target for ${name}. Set either ${name}_HOST + ${name}_PORT (internal) or ${name}_PUBLIC_URL (public).`,
    );
    process.exit(1);
  }
  console.log(
    `[BOOT] ${name} → ${target ? target : '(disabled: no target provided)'}`,
  );
  return target;
};

const proxyOpts = (target, stripPrefix) => ({
  target,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 12_000,
  timeout: 15_000,
  logLevel: 'warn',
  pathRewrite: stripPrefix ? { [`^${stripPrefix}`]: '' } : undefined,
  onError(err, req, res) {
    console.error('Proxy error:', err.code || err.message, '→', target);
    if (!res.headersSent) {
      res
        .status(502)
        .json({ error: 'Upstream unavailable', code: err.code || 'EUPSTREAM' });
    }
  },
});

// ---------- envs ----------
const {
  // required upstreams (set either internal or public)
  AUTH_HOST,
  AUTH_PORT,
  AUTH_PUBLIC_URL,

  INVENTORY_HOST,
  INVENTORY_PORT,
  INVENTORY_PUBLIC_URL,

  // optional upstreams
  CLIENT_HOST,
  CLIENT_PORT,
  CLIENT_PUBLIC_URL,

  BARCODE_HOST,
  BARCODE_PORT,
  BARCODE_PUBLIC_URL,

  // CORS origin for browser apps (e.g., your Vercel domain)
  ALLOW_ORIGIN,
} = process.env;

// ---------- build targets ----------
const AUTH_URL = chooseTarget(
  'AUTH',
  AUTH_HOST,
  AUTH_PORT,
  AUTH_PUBLIC_URL,
  true,
);
const INVENTORY_URL = chooseTarget(
  'INVENTORY',
  INVENTORY_HOST,
  INVENTORY_PORT,
  INVENTORY_PUBLIC_URL,
  true,
);
const CLIENT_URL = chooseTarget(
  'CLIENT',
  CLIENT_HOST,
  CLIENT_PORT,
  CLIENT_PUBLIC_URL,
  false,
);
const BARCODE_URL = chooseTarget(
  'BARCODE',
  BARCODE_HOST,
  BARCODE_PORT,
  BARCODE_PUBLIC_URL,
  false,
);

// ---------- app ----------
const app = express();
app.set('trust proxy', true);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: ALLOW_ORIGIN || true, // set exact origin in prod
    credentials: true,
  }),
);
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms'),
);

app.get('/healthz', (_, res) => res.status(200).send('ok'));

// ---------- proxies ----------
// NOTE: strip the /api/* prefix so upstreams receive clean paths.
// Adjust prefixes if your upstream routes differ.
if (AUTH_URL) app.use('/api/auth', createProxyMiddleware(proxyOpts(AUTH_URL)));
if (INVENTORY_URL)
  app.use('/api/items', createProxyMiddleware(proxyOpts(INVENTORY_URL)));
if (CLIENT_URL)
  app.use('/api/clients', createProxyMiddleware(proxyOpts(CLIENT_URL)));
if (BARCODE_URL)
  app.use('/api/barcodes', createProxyMiddleware(proxyOpts(BARCODE_URL)));

// ---------- start ----------
const PORT = process.env.PORT || 10_000;
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on :${PORT}`);
});
console.log(`   → Auth:      ${AUTH_URL}`);
console.log(`   → Inventory: ${INVENTORY_URL}`);
if (CLIENT_URL) console.log(`   → Client:    ${CLIENT_URL}`);
if (BARCODE_URL) console.log(`   → Barcode:   ${BARCODE_URL}`);
