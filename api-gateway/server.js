// api-gateway/server.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
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
  console.log(`[BOOT] ${name} → ${target ? target : '(disabled)'}`);
  return target;
};

// tunables (env can override)
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 30000);
const CLIENT_TIMEOUT_MS = Number(process.env.CLIENT_TIMEOUT_MS || 35000);

// keep-alive to cut TLS handshake overhead
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// redact helper for header logs
const redact = (obj = {}, keys = ['authorization', 'cookie']) => {
  const lower = Object.fromEntries(
    Object.entries(obj || {}).map(([k, v]) => [String(k).toLowerCase(), v]),
  );
  keys.forEach((k) => {
    if (lower[k] !== undefined) lower[k] = '[REDACTED]';
  });
  return lower;
};

// correlation id
const requestId = (req) =>
  req.headers['x-request-id']?.toString() || crypto.randomUUID();

// proxy opts + deep logs
const proxyOpts = (name, target, options = {}) => ({
  target,
  changeOrigin: true,
  xfwd: true,
  agent: target.startsWith('https') ? httpsAgent : httpAgent,
  proxyTimeout: PROXY_TIMEOUT_MS,
  timeout: CLIENT_TIMEOUT_MS,
  logLevel: 'warn',
  ...options,

  onProxyReq(proxyReq, req, _res) {
    const upstreamPath = proxyReq.path || req.url;
    console.log(
      `[GW→UP] ${req.id} ${req.method} ${
        req.originalUrl
      } → ${target}${upstreamPath} :: headers=${JSON.stringify(
        redact(proxyReq.getHeaders()),
      )}`,
    );

    // forward parsed JSON body (if any)
    if (req.body && Object.keys(req.body).length) {
      const body = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(body));
      proxyReq.write(body);
    }

    req._gwUpStart = process.hrtime.bigint();
  },

  onProxyRes(proxyRes, req, res) {
    const start = req._gwUpStart || process.hrtime.bigint();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      `[UP→GW] ${req.id} ${req.method} ${
        req.originalUrl
      } ← ${target} :: status=${proxyRes.statusCode} upstream=${ms.toFixed(
        1,
      )}ms`,
    );
    if (typeof options.onProxyRes === 'function') {
      options.onProxyRes(proxyRes, req, res);
    }
  },

  onError(err, req, res) {
    const ms = req._gwUpStart
      ? `${(Number(process.hrtime.bigint() - req._gwUpStart) / 1e6).toFixed(
          1,
        )}ms`
      : 'n/a';
    console.error(
      `[ERR ] ${req.id} ${req.method} ${req.originalUrl} → ${target} :: ${
        err.code || err.message
      } after ${ms}`,
    );
    if (!res.headersSent)
      res
        .status(502)
        .json({ error: 'Upstream unavailable', code: err.code || 'EUPSTREAM' });
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

// correlation + end-to-end timing
app.use((req, res, next) => {
  req.id = requestId(req);
  const start = process.hrtime.bigint();
  const src = req.headers['x-forwarded-for'] || req.ip;
  console.log(
    `[IN  ] ${req.id} ${req.method} ${
      req.originalUrl
    } from ${src} :: headers=${JSON.stringify(redact(req.headers))}`,
  );
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
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: ALLOW_ORIGIN || true, credentials: true }));

// concise access log
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms'),
);

// health
app.get('/healthz', (_, res) => res.status(200).send('ok'));

// ---------- diagnostics (temporary; useful during debugging) ----------
app.get('/_diag/auth/health', async (_req, res) => {
  try {
    const url = new URL('/healthz', AUTH_URL).toString();
    const t0 = performance.now();
    const r = await fetch(url, { method: 'GET' });
    const txt = await r.text();
    const t1 = performance.now();
    res
      .status(200)
      .json({ url, status: r.status, body: txt, ms: +(t1 - t0).toFixed(1) });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/_diag/auth/login', async (req, res) => {
  try {
    const url = new URL('/api/auth/login', AUTH_URL).toString();
    const t0 = performance.now();
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body || { email: 'test@x', password: 'x' }),
    });
    const txt = await r.text();
    const t1 = performance.now();
    res
      .status(200)
      .json({ url, status: r.status, body: txt, ms: +(t1 - t0).toFixed(1) });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- proxies ----------
// Pre-proxy tracer proves we hit the proxy chain and shows Express' base/url
const trace = (label) => (req, _res, next) => {
  console.log(
    `[HIT ${label}] id=${req.id} baseUrl=${req.baseUrl} url=${req.url} originalUrl=${req.originalUrl}`,
  );
  next();
};

// Preserve the FULL original path so upstreams see /api/... unchanged.
if (AUTH_URL)
  app.use(
    '/api/auth',
    trace('AUTH'),
    createProxyMiddleware(
      proxyOpts('AUTH', AUTH_URL, {
        pathRewrite: (_p, req) => req.originalUrl,
      }),
    ),
  );

if (INVENTORY_URL)
  app.use(
    '/api/items',
    trace('ITEMS'),
    createProxyMiddleware(
      proxyOpts('INVENTORY', INVENTORY_URL, {
        pathRewrite: (_p, req) => req.originalUrl,
      }),
    ),
  );

if (CLIENT_URL)
  app.use(
    '/api/clients',
    trace('CLIENTS'),
    createProxyMiddleware(
      proxyOpts('CLIENT', CLIENT_URL, {
        pathRewrite: (_p, req) => req.originalUrl,
      }),
    ),
  );

if (BARCODE_URL)
  app.use(
    '/api/barcodes',
    trace('BARCODES'),
    createProxyMiddleware(
      proxyOpts('BARCODE', BARCODE_URL, {
        pathRewrite: (_p, req) => req.originalUrl,
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
