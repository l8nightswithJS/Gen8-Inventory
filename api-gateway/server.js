import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import { Readable } from 'stream';

const {
  PORT: APP_PORT,
  CORS_ORIGIN = '',
  AUTH_URL,
  INVENTORY_URL,
  CLIENT_URL,
  BARCODE_URL,
  INTERNAL_GATEWAY_KEY,
} = process.env;

const requiredValues = {
  AUTH_URL,
  INVENTORY_URL,
  CLIENT_URL,
  BARCODE_URL,
  CORS_ORIGIN,
  INTERNAL_GATEWAY_KEY,
};
for (const [key, value] of Object.entries(requiredValues)) {
  if (!value) {
    console.error(`[GW] FATAL: Missing required environment variable ${key}`);
    process.exit(1);
  }
}

const PORT = Number(APP_PORT) || 8080;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowlist = CORS_ORIGIN.split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowlist.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed.'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
};

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 20;
const loginAttempts = new Map();

function loginRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const current = loginAttempts.get(key);
  const record = !current || now - current.startedAt >= LOGIN_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : current;

  record.count += 1;
  loginAttempts.set(key, record);

  if (record.count > LOGIN_ATTEMPT_LIMIT) {
    const retrySeconds = Math.max(
      1,
      Math.ceil((LOGIN_WINDOW_MS - (now - record.startedAt)) / 1000),
    );
    res.setHeader('Retry-After', String(retrySeconds));
    return res.status(429).json({
      message: 'Too many login attempts. Try again later.',
    });
  }

  return next();
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
    const target = new URL(req.originalUrl, targetUrl);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    delete headers['accept-encoding'];
    delete headers['x-internal-gateway-key'];
    headers['accept-encoding'] = 'identity';
    headers['x-internal-gateway-key'] = INTERNAL_GATEWAY_KEY;

    const options = {
      method: req.method,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    };

    const isJsonRequest = req.headers['content-type']?.includes('application/json');

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isJsonRequest) {
        options.body = JSON.stringify(req.body);
      } else {
        options.body = req;
        options.duplex = 'half';
      }
    }

    const response = await fetch(target, options);
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
    console.error('[GW] Proxy request failed:', {
      name: error?.name,
      message: error?.message,
    });
    if (!res.headersSent) {
      return res.status(503).json({
        message: 'A backend service is temporarily unavailable.',
      });
    }
    return res.end();
  }
};

app.post('/api/auth/login', loginRateLimit, proxyRequest(AUTH_URL));
app.use('/api/auth', proxyRequest(AUTH_URL));
app.use('/api/users', proxyRequest(AUTH_URL));
app.use('/api/items', proxyRequest(INVENTORY_URL));
app.use('/api/inventory', proxyRequest(INVENTORY_URL));
app.use('/api/locations', proxyRequest(INVENTORY_URL));
app.use('/api/labels', proxyRequest(INVENTORY_URL));
app.use('/api/receiving', proxyRequest(INVENTORY_URL));
app.use('/api/clients', proxyRequest(CLIENT_URL));
app.use('/api/barcodes', proxyRequest(BARCODE_URL));
app.use('/api/scan', proxyRequest(BARCODE_URL));

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use((_req, res) => res.status(404).json({ message: 'Not found.' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] API Gateway listening on port ${PORT}`);
});
