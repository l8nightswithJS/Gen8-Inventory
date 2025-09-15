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

// ✅ Best Practice: Validate required environment variables on startup.
// This prevents the server from starting in a broken state.
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

app.use(express.json());
app.use(morgan('tiny'));

// --- PROXY FUNCTION ---
const proxyRequest = (targetUrl) => async (req, res) => {
  try {
    const target = new URL(req.originalUrl, targetUrl);
    const headers = { ...req.headers };

    // ✅ FIX 1: Delete the original 'host' header.
    // Let the fetch client set the correct host based on the target URL. This is standard practice for proxying.
    delete headers.host;

    const response = await fetch(target, {
      method: req.method,
      headers,
      // ✅ FIX 2: Simplified and safe body handling.
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

    // Forward the status code and headers from the service back to the client
    res.statusCode = response.status;
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    // ✅ FIX 3: Safely pipe the response body only if it exists.
    // This prevents a crash if the downstream service returns a response with no body (e.g., 204 No Content).
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
// You have two routes pointing to BARCODE_URL, which is fine. Just confirming this is intended.
app.use('/api/barcodes', proxyRequest(BARCODE_URL));
app.use('/api/scan', proxyRequest(BARCODE_URL));

// --- Health check & 404 ---
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] API Gateway listening on port ${PORT}`);
});
