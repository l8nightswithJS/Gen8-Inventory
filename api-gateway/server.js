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
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowlist.length === 0 || allowlist.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// We still use express.json() for requests that ARE json
app.use(express.json());
app.use(morgan('tiny'));

// --- PROXY FUNCTION ---
const proxyRequest = (targetUrl) => async (req, res) => {
  try {
    const target = new URL(req.originalUrl, targetUrl);
    const headers = { ...req.headers };

    // Let the fetch client set the correct host based on the target URL.
    delete headers.host;

    const options = {
      method: req.method,
      headers,
      // ✅ This is required by Node's fetch to properly handle streamed request bodies
      duplex: 'half',
    };

    const isJsonRequest =
      req.headers['content-type']?.includes('application/json');

    // ✅ FINAL FIX: Handle JSON and other body types (like file uploads) differently
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isJsonRequest) {
        // For JSON, we stringify the body that express.json() parsed for us
        options.body = JSON.stringify(req.body);
        // Since we created a new body, we must remove the original content-length header
        delete headers['content-length'];
      } else {
        // For all other types (like multipart/form-data), we stream the raw request
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

// --- Routes ---
app.use('/api/auth', proxyRequest(AUTH_URL));
app.use('/api/users', proxyRequest(AUTH_URL));
app.use('/api/items', proxyRequest(INVENTORY_URL));
app.use('/api/inventory', proxyRequest(INVENTORY_URL));
app.use('/api/locations', proxyRequest(INVENTORY_URL));
app.use('/api/clients', proxyRequest(CLIENT_URL));
app.use('/api/barcodes', proxyRequest(BARCODE_URL));
app.use('/api/scan', proxyRequest(BARCODE_URL));

// --- Health check & 404 ---
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] API Gateway listening on port ${PORT}`);
});
