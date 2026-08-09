import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { Readable } from 'stream';

const {
  PORT: RENDER_PORT,
  CORS_ORIGIN = '',
  AUTH_URL,
  INVENTORY_URL,
  CLIENT_URL,
  BARCODE_URL,
} = process.env;

const requiredUrls = { AUTH_URL, INVENTORY_URL, CLIENT_URL, BARCODE_URL };
for (const [key, value] of Object.entries(requiredUrls)) {
  if (!value) {
    console.error(`[GW] FATAL: Missing required environment variable ${key}`);
    process.exit(1);
  }
}

const PORT = Number(RENDER_PORT) || 8080;
const app = express();
const allowlist = CORS_ORIGIN.split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowlist.length === 0 || allowlist.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const readyUntil = new Map();
const READY_CACHE_MS = 10 * 60 * 1000;
const WAKE_ATTEMPTS = 13;
const WAKE_DELAY_MS = 5000;

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function ensureUpstreamReady(targetUrl) {
  const cachedUntil = readyUntil.get(targetUrl) || 0;
  if (cachedUntil > Date.now()) return;

  const healthUrl = new URL('/healthz', targetUrl);

  for (let attempt = 1; attempt <= WAKE_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          'Accept-Encoding': 'identity',
        },
        signal: AbortSignal.timeout(10000),
      });

      const contentType = response.headers.get('content-type') || '';
      const isReady = response.ok && contentType.includes('application/json');
      await response.arrayBuffer().catch(() => undefined);

      if (isReady) {
        readyUntil.set(targetUrl, Date.now() + READY_CACHE_MS);
        if (attempt > 1) {
          console.log(
            `[GW] Upstream ${healthUrl.hostname} became ready on attempt ${attempt}.`,
          );
        }
        return;
      }
    } catch (error) {
      if (attempt === WAKE_ATTEMPTS) {
        console.error(
          `[GW] Upstream health check failed for ${healthUrl.hostname}:`,
          error.message,
        );
      }
    }

    if (attempt === 1) {
      console.log(`[GW] Waiting for sleeping upstream ${healthUrl.hostname}...`);
    }

    if (attempt < WAKE_ATTEMPTS) {
      await sleep(WAKE_DELAY_MS);
    }
  }

  throw new Error(`Upstream ${healthUrl.hostname} is unavailable.`);
}

const skippedResponseHeaders = new Set([
  'access-control-allow-credentials',
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-allow-origin',
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

const proxyRequest = (targetUrl) => async (req, res) => {
  try {
    await ensureUpstreamReady(targetUrl);

    const target = new URL(req.originalUrl, targetUrl);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    delete headers['accept-encoding'];
    headers['accept-encoding'] = 'identity';

    const options = {
      method: req.method,
      headers,
      redirect: 'manual',
    };

    const isJsonRequest = req.headers['content-type']?.includes(
      'application/json',
    );

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isJsonRequest) {
        options.body = JSON.stringify(req.body);
      } else {
        options.body = req;
        options.duplex = 'half';
      }
    }

    const response = await fetch(target, options);

    if ([502, 503, 504].includes(response.status)) {
      readyUntil.delete(targetUrl);
    }

    res.status(response.status);
    response.headers.forEach((value, name) => {
      if (!skippedResponseHeaders.has(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('[GW] Proxy request failed:', error);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'A backend service is starting. Please try again shortly.',
      });
    } else {
      res.end();
    }
  }
};

const publicWarmupTargets = [
  {
    name: 'Auth',
    url: new URL('/healthz', AUTH_URL).toString(),
  },
  {
    name: 'Inventory',
    url: new URL('/healthz', INVENTORY_URL).toString(),
  },
  {
    name: 'Clients',
    url: new URL('/readyz', CLIENT_URL).toString(),
  },
  {
    name: 'Barcode',
    url: new URL('/healthz', BARCODE_URL).toString(),
  },
];

// Public, non-secret service readiness targets. The browser calls these URLs
// directly so Render sees inbound traffic for every sleeping free service.
app.get('/bootstrap/services', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ services: publicWarmupTargets });
});

app.use('/api/auth', proxyRequest(AUTH_URL));
app.use('/api/users', proxyRequest(AUTH_URL));
app.use('/api/items', proxyRequest(INVENTORY_URL));
app.use('/api/inventory', proxyRequest(INVENTORY_URL));
app.use('/api/locations', proxyRequest(INVENTORY_URL));
app.use('/api/clients', proxyRequest(CLIENT_URL));
app.use('/api/barcodes', proxyRequest(BARCODE_URL));
app.use('/api/scan', proxyRequest(BARCODE_URL));

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] API Gateway listening on port ${PORT}`);
});
