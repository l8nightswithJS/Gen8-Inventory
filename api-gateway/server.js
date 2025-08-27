// api-gateway/server.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createProxyMiddleware } from 'http-proxy-middleware';

// ---------- boot tag ----------
const BUILD_TAG = `[BOOT] GW v2.3 @ ${new Date().toISOString()}`;
console.log(BUILD_TAG);

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

// ---------- tunables ----------
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 45000);
const CLIENT_TIMEOUT_MS = Number(process.env.CLIENT_TIMEOUT_MS || 50000);

// keep-alive agents
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// correlation id
const requestId = (req) =>
  req.headers['x-request-id']?.toString() || crypto.randomUUID();

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

// request trace + total timing
app.use((req, res, next) => {
  req.id = requestId(req);
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
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: ALLOW_ORIGIN || true, credentials: true }));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms'),
);

// health + version
app.get('/healthz', (_, res) => res.status(200).send('ok'));
app.get('/__version', (req, res) => {
  res.json({
    tag: BUILD_TAG,
    commit: process.env.RENDER_GIT_COMMIT || null,
    targets: { AUTH_URL, INVENTORY_URL, CLIENT_URL, BARCODE_URL },
    timeouts: { PROXY_TIMEOUT_MS, CLIENT_TIMEOUT_MS },
  });
});

// ---------- diagnostics (gateway → auth) ----------
app.get('/_diag/auth/health', async (_req, res) => {
  try {
    const url = new URL('/healthz', AUTH_URL).toString();
    const t0 = performance.now();
    const r = await fetch(url);
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

// ---------- proxy factory with deep logs ----------
const mkProxy = (name, target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    agent: target.startsWith('https') ? httpsAgent : httpAgent,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: CLIENT_TIMEOUT_MS,
    logLevel: 'warn',

    onProxyReq(proxyReq, req) {
      const id = req.id || 'unknown';
      const path = proxyReq.path || req.url;
      console.log(
        `[GW→UP] ${id} ${req.method} ${req.originalUrl} → ${target}${path}`,
      );
      proxyReq.setTimeout(PROXY_TIMEOUT_MS, () => {
        const elapsed = req._gwUpStart
          ? `${(Number(process.hrtime.bigint() - req._gwUpStart) / 1e6).toFixed(
              1,
            )}ms`
          : 'n/a';
        console.error(
          `[TIMEOUT] ${id} ${req.method} ${req.originalUrl} → ${target}${path} after ${elapsed}`,
        );
      });
      proxyReq.on('error', (e) => {
        console.error(
          `[PERR] ${id} ${req.method} ${
            req.originalUrl
          } → ${target}${path} :: ${e.code || e.message}`,
        );
      });

      // forward parsed JSON body (if any)
      try {
        if (req.body && Object.keys(req.body).length) {
          const body = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(body));
          proxyReq.write(body);
        }
      } catch (e) {
        console.error(
          `[PERR] ${id} could not serialize body: ${e?.message || e}`,
        );
      }

      req._gwUpStart = process.hrtime.bigint();
    },

    onProxyRes(proxyRes, req) {
      const id = req.id || 'unknown';
      const start = req._gwUpStart || process.hrtime.bigint();
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(
        `[UP→GW] ${id} ${req.method} ${req.originalUrl} ← ${target} :: status=${
          proxyRes.statusCode
        } upstream=${ms.toFixed(1)}ms`,
      );
    },

    onError(err, req, res) {
      const id = req.id || 'unknown';
      const ms = req._gwUpStart
        ? `${(Number(process.hrtime.bigint() - req._gwUpStart) / 1e6).toFixed(
            1,
          )}ms`
        : 'n/a';
      console.error(
        `[ERR ] ${id} ${req.method} ${req.originalUrl} → ${target} :: ${
          err.code || err.message
        } after ${ms}`,
      );
      if (!res.headersSent)
        res
          .status(502)
          .json({
            error: 'Upstream unavailable',
            code: err.code || 'EUPSTREAM',
          });
    },
  });

// ---------- route tracers (prove we hit the proxy) ----------
const trace = (label) => (req, _res, next) => {
  console.log(
    `[HIT ${label}] id=${req.id} baseUrl=${req.baseUrl} url=${req.url} originalUrl=${req.originalUrl}`,
  );
  next();
};

// ---------- proxies (prepend the stripped base manually) ----------
// NOTE: Express strips '/api/auth' from req.url. We add it back ourselves
//       then hand off to the proxy. No pathRewrite function involved.
if (AUTH_URL) {
  const authProxy = mkProxy('AUTH', AUTH_URL);
  app.use('/api/auth', trace('AUTH'), (req, res, next) => {
    req.url = '/api/auth' + req.url; // e.g. '/login' -> '/api/auth/login'
    authProxy(req, res, next);
  });
}

if (INVENTORY_URL) {
  const invProxy = mkProxy('INVENTORY', INVENTORY_URL);
  app.use('/api/items', trace('ITEMS'), (req, res, next) => {
    req.url = '/api/items' + req.url;
    invProxy(req, res, next);
  });
}

if (CLIENT_URL) {
  const cliProxy = mkProxy('CLIENT', CLIENT_URL);
  app.use('/api/clients', trace('CLIENTS'), (req, res, next) => {
    req.url = '/api/clients' + req.url;
    cliProxy(req, res, next);
  });
}

if (BARCODE_URL) {
  const bcProxy = mkProxy('BARCODE', BARCODE_URL);
  app.use('/api/barcodes', trace('BARCODES'), (req, res, next) => {
    req.url = '/api/barcodes' + req.url;
    bcProxy(req, res, next);
  });
}

// ---------- start ----------
const PORT = process.env.PORT || 10_000;
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on :${PORT}`);
  console.log(`   → Auth:      ${AUTH_URL}`);
  console.log(`   → Inventory: ${INVENTORY_URL}`);
  if (CLIENT_URL) console.log(`   → Client:    ${CLIENT_URL}`);
  if (BARCODE_URL) console.log(`   → Barcode:   ${BARCODE_URL}`);
});
