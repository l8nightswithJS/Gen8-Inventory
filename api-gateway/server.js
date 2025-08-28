// api-gateway/server.js — v2.7 (preserve originalUrl to upstream)
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { createProxyMiddleware } from 'http-proxy-middleware';

const BUILD_TAG = `[BOOT] GW v2.7 @ ${new Date().toISOString()}`;
console.log(BUILD_TAG);

// ---------- env ----------
const {
  AUTH_HOST,
  AUTH_PORT,
  AUTH_PUBLIC_URL,
  INVENTORY_HOST,
  INVENTORY_PORT,
  INVENTORY_PUBLIC_URL,
  CLIENT_HOST,
  CLIENT_PORT,
  CLIENT_PUBLIC_URL,
  BARCODE_HOST,
  BARCODE_PORT,
  BARCODE_PUBLIC_URL,
  ALLOW_ORIGIN,
} = process.env;

// ---------- helpers ----------
const buildInternal = (h, p) => (h && p ? `http://${h}:${p}` : undefined);
const choose = (name, h, p, pub, required = true) => {
  const t = buildInternal(h, p) || pub;
  if (!t && required) {
    console.error(
      `[BOOT] Missing target for ${name} (set ${name}_HOST+_PORT or ${name}_PUBLIC_URL)`,
    ); // fatal
    process.exit(1);
  }
  console.log(`[BOOT] ${name} → ${t || '(disabled)'}`);
  return t;
};

// ---------- targets ----------
const AUTH_URL = choose('AUTH', AUTH_HOST, AUTH_PORT, AUTH_PUBLIC_URL, true);
const INVENTORY_URL = choose(
  'INVENTORY',
  INVENTORY_HOST,
  INVENTORY_PORT,
  INVENTORY_PUBLIC_URL,
  true,
);
const CLIENT_URL = choose(
  'CLIENT',
  CLIENT_HOST,
  CLIENT_PORT,
  CLIENT_PUBLIC_URL,
  false,
);
const BARCODE_URL = choose(
  'BARCODE',
  BARCODE_HOST,
  BARCODE_PORT,
  BARCODE_PUBLIC_URL,
  false,
);

// ---------- proxy config ----------
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 45000);
const CLIENT_TIMEOUT_MS = Number(process.env.CLIENT_TIMEOUT_MS || 50000);
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const reqId = (req) =>
  req.headers['x-request-id']?.toString() || crypto.randomUUID();

const mkProxy = (label, target, { preserveFullPath = false } = {}) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    agent: target.startsWith('https') ? httpsAgent : httpAgent,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: CLIENT_TIMEOUT_MS,
    logLevel: 'warn',

    // Force upstream to see the full original URL when requested
    ...(preserveFullPath && {
      pathRewrite: (_path, req) => req.originalUrl, // e.g. '/api/auth/login' stays '/api/auth/login'
    }),

    onProxyReq(proxyReq, req) {
      const id = req.id || 'unknown';
      // Resolve what path the upstream will actually get
      const upstreamPath = preserveFullPath
        ? req.originalUrl
        : proxyReq.path || req.url;
      console.log(
        `[GW→UP] ${id} ${req.method} ${req.originalUrl} → ${target}${upstreamPath}`,
      );
      req._upStart = process.hrtime.bigint();
      proxyReq.setTimeout(PROXY_TIMEOUT_MS, () => {
        const ms = req._upStart
          ? (Number(process.hrtime.bigint() - req._upStart) / 1e6).toFixed(1)
          : 'n/a';
        console.error(
          `[TIMEOUT] ${id} ${req.method} ${req.originalUrl} → ${target}${upstreamPath} after ${ms}`,
        );
      });
    },

    onProxyRes(proxyRes, req) {
      const ms = req._upStart
        ? (Number(process.hrtime.bigint() - req._upStart) / 1e6).toFixed(1)
        : 'n/a';
      console.log(
        `[UP→GW] ${req.id} ${req.method} ${req.originalUrl} ← ${target} :: status=${proxyRes.statusCode} upstream=${ms}ms`,
      );
    },

    onError(err, req, res) {
      const ms = req._upStart
        ? (Number(process.hrtime.bigint() - req._upStart) / 1e6).toFixed(1)
        : 'n/a';
      console.error(
        `[ERR ] ${req.id} ${req.method} ${req.originalUrl} → ${target} :: ${
          err.code || err.message
        } after ${ms}ms`,
      );
      if (!res.headersSent)
        res.status(502).json({
          error: 'Upstream unavailable',
          code: err.code || 'EUPSTREAM',
        });
    },
  });

// ---------- app ----------
const app = express();
app.set('trust proxy', true);

// light request log + total timing
app.use((req, res, next) => {
  req.id = reqId(req);
  const start = process.hrtime.bigint();
  const src = req.headers['x-forwarded-for'] || req.ip;
  console.log(`[IN  ] ${req.id} ${req.method} ${req.originalUrl} from ${src}`);
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      `[OUT ] ${req.id} ${req.method} ${req.originalUrl} → ${
        res.statusCode
      } total=${ms.toFixed(1)}ms`,
    );
  });
  next();
});

app.use(helmet());
app.use(cors({ origin: ALLOW_ORIGIN || true, credentials: true }));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms'),
);

// IMPORTANT: mount proxies BEFORE any body parser
// AUTH — preserve full original path so upstream sees /api/auth/login
app.use('/api/auth', mkProxy('AUTH', AUTH_URL, { preserveFullPath: true }));

// Others — keep default behavior (adjust if your services expect a prefix)
app.use(
  '/api/items',
  mkProxy('INVENTORY', INVENTORY_URL, { preserveFullPath: true }),
);
app.use(
  '/api/clients',
  mkProxy('CLIENT', CLIENT_URL, { preserveFullPath: true }),
);
app.use(
  '/api/barcodes',
  mkProxy('BARCODE', BARCODE_URL, { preserveFullPath: true }),
);

// Only after proxies: JSON parser for our own handlers (if any)
app.use(express.json({ limit: '1mb' }));

// health + version
app.get('/healthz', (_, res) => res.status(200).send('ok'));
app.get('/__version', (_req, res) =>
  res.json({
    tag: BUILD_TAG,
    commit: process.env.RENDER_GIT_COMMIT || null,
    targets: { AUTH_URL, INVENTORY_URL, CLIENT_URL, BARCODE_URL },
    timeouts: { PROXY_TIMEOUT_MS, CLIENT_TIMEOUT_MS },
  }),
);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on :${PORT}`);
  console.log(`   → Auth:      ${AUTH_URL}`);
  console.log(`   → Inventory: ${INVENTORY_URL}`);
  if (CLIENT_URL) console.log(`   → Client:    ${CLIENT_URL}`);
  if (BARCODE_URL) console.log(`   → Barcode:   ${BARCODE_URL}`);
});
