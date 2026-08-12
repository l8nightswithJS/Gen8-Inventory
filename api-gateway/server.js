import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { Readable } from 'stream';

const {
  PORT: APP_PORT,
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

const PORT = Number(APP_PORT) || 8080;
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
    headers['accept-encoding'] = 'identity';

    const options = {
      method: req.method,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
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
        message: 'A backend service could not be reached. Please try again.',
      });
    } else {
      res.end();
    }
  }
};

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
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] API Gateway listening on port ${PORT}`);
});
