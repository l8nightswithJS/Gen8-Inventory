import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { Readable } from 'stream';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

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
  .map((s) => s.trim())
  .filter(Boolean);

// ✅ FIX: Update the CORS options to be more explicit
const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowlist.length === 0 || allowlist.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly allow the Authorization header
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(morgan('tiny'));

// ... The rest of your server file (proxyRequest function, routes, etc.) remains the same ...
const proxyRequest = (targetUrl) => async (req, res) => {
  try {
    const target = new URL(req.originalUrl, targetUrl);
    const headers = { ...req.headers };
    delete headers.host;

    const options = {
      method: req.method,
      headers,
      duplex: 'half',
    };

    const isJsonRequest =
      req.headers['content-type']?.includes('application/json');

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isJsonRequest) {
        options.body = JSON.stringify(req.body);
        delete headers['content-length'];
      } else {
        options.body = req;
      }
    }

    const response = await fetch(target, options);

    res.statusCode = response.status;
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('[PROXY] Error forwarding request:', error);
    res.status(502).json({ error: 'Bad Gateway', details: error.message });
  }
};
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
