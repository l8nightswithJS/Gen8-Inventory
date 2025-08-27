// api-gateway/server.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { createProxyMiddleware } from 'http-proxy-middleware';

// ----- helpers -----
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
  console.log(`[BOOT] ${name} → ${target ? target : '(disabled)'}`);
  return target;
};

// env overrides for timeouts if you want to tune later
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 30000);
const CLIENT_TIMEOUT_MS = Number(process.env.CLIENT_TIMEOUT_MS || 35000);

// keep-alive agents (lower TLS handshake overhead)
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// redact helper for headers
const redact = (obj = {}, keys = ['authorization', 'cookie']) => {
  const lower = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [String(k).toLowerCase(), v]),
  );
  keys.forEach((k) => {
    if (lower[k] !== undefined) lower[k] = '[REDACTED]';
  });
  return lower;
};

// correlation id
const requestId = (req) =>
  req.headers['x-request-id']?.toString() || crypto.randomUUID();

// build proxy opts with deep logging
const proxyOpts = (name, target, options = {}) => ({
  target,
  changeOrigin: true,
  xfwd: true,
  agent: target.startsWith('https') ? httpsAgent : httpAgent,
  proxyTimeout: PROXY_TIMEOUT_MS,
  timeout: CLIENT_TIMEOUT_MS,
  logLevel: 'warn',
  ...options,

  // If you've parsed the body with express.json(), re-send it to the upstream.
  onProxyReq(proxyReq, req, res) {
    const id = req.id || 'unknown';
    // Log the *actual* path going upstream (req.url is path after mount)
    const upstreamPath = proxyReq.path || req.url;
    console.log(
      `[GW→UP] ${id} ${req.method} ${
        req.originalUrl
      } → ${target}${upstreamPath} :: headers=${JSON.stringify(
        redact(proxyReq.getHeaders()),
      )}`,
    );

    // Re-send JSON body if present (prevents empty-body issues)
    if (req.body && Object.keys(req.body).length) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }

    // timing marker for upstream leg
    req._gwUpstreamStart = process.hrtime.bigint();
  },

  onProxyRes(proxyRes, req, res) {
    const id = req.id || 'unknown';
    const started = req._gwUpstreamStart || process.hrtime.bigint();
    const durMs = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(
      `[UP→GW] ${id} ${req.method} ${req.originalUrl} ← ${target} :: status=${
        proxyRes.statusCode
      } upstream=${durMs.toFixed(1)}ms`,
    );
    if (typeof options.onProxyRes === 'function') {
      options.onProxyRes(proxyRes, req, res);
    }
  },

  onError(err, req, res) {
    const id = req.id || 'unknown';
    const dur = req._gwUpstreamStart
      ? `${(
          Number(process.hrtime.bigint() - req._gwUpstreamStart) / 1e6
        ).toFixed(1)}ms`
      : 'n/a';
    console.error(
      `[ERR ] ${id} ${req.method} ${req.originalUrl} → ${target} :: ${
        err.code || err.message
      } after ${dur}`,
    );
    if (!res.headersSent) {
      res
        .status(502)
        .json({ error: 'Upstream unavailable', code: err.code || 'EUPSTREAM' });
    }
  },
});

// ---------- envs ----------
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

// request-level correlation + timing
app.use((req, res, next) => {
  req.id = requestId(req);
  const start = process.hrtime.bigint();
  const srcIp = req.headers['x-forwarded-for'] || req.ip;
  console.log(
    `[IN  ] ${req.id} ${req.method} ${
      req.originalUrl
    } from ${srcIp} :: headers=${JSON.stringify(redact(req.headers))}`,
  );
  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      `[OUT ] ${req.id} ${req.method} ${req.originalUrl} → ${
        res.statusCode
      } total=${durMs.toFixed(1)}ms`,
    );
  });
  next();
});

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: ALLOW_ORIGIN || true, // set exact origin in prod
    credentials: true,
  }),
);

// concise access log stays (pairs nicely with the detailed logs)
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms'),
);

app.get('/healthz', (_, res) => res.status(200).send('ok'));

// ---------- proxies ----------
// IMPORTANT: preserve the FULL original path so upstreams receive /api/... unchanged
if (AUTH_URL)
  app.use(
    '/api/auth',
    createProxyMiddleware(
      proxyOpts('AUTH', AUTH_URL, { pathRewrite: (p, req) => req.originalUrl }),
    ),
  );

if (INVENTORY_URL)
  app.use(
    '/api/items',
    createProxyMiddleware(
      proxyOpts('INVENTORY', INVENTORY_URL, {
        pathRewrite: (p, req) => req.originalUrl,
      }),
    ),
  );

if (CLIENT_URL)
  app.use(
    '/api/clients',
    createProxyMiddleware(
      proxyOpts('CLIENT', CLIENT_URL, {
        pathRewrite: (p, req) => req.originalUrl,
      }),
    ),
  );

if (BARCODE_URL)
  app.use(
    '/api/barcodes',
    createProxyMiddleware(
      proxyOpts('BARCODE', BARCODE_URL, {
        pathRewrite: (p, req) => req.originalUrl,
      }),
    ),
  );

// ---------- start ----------
const PORT = process.env.PORT || 10_000;
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on :${PORT}`);
  console.log(`   → Auth:      ${AUTH_URL}`);
  console.log(`   → Inventory: ${INVENTORY_URL}`);
  if (CLIENT_URL) console.log(`   → Client:    ${CLIENT_URL}`);
  if (BARCODE_URL) console.log(`   → Barcode:   ${BARCODE_URL}`);
});
