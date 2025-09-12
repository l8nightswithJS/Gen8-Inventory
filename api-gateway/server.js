import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { Readable } from 'stream'; // Import Readable for streaming

const {
  PORT: RENDER_PORT,
  CORS_ORIGIN = '',
  AUTH_URL,
  INVENTORY_URL,
  CLIENT_URL,
  BARCODE_URL,
} = process.env;
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
    headers.host = target.host;

    const response = await fetch(target, {
      method: req.method,
      headers,
      body:
        req.method !== 'GET' && req.method !== 'HEAD'
          ? JSON.stringify(req.body)
          : undefined,
    });

    // Forward the status code and headers from the service back to the client
    res.statusCode = response.status;
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    // Correctly stream the response body back to the client
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error('[PROXY] Error forwarding request:', error);
    res.status(502).json({ error: 'Bad Gateway' });
  }
};

// --- Routes ---
app.use('/api/auth', proxyRequest(AUTH_URL));
app.use('/api/users', proxyRequest(AUTH_URL));
app.use('/api/items', proxyRequest(INVENTORY_URL));
app.use('/api/inventory', proxyRequest(INVENTORY_URL));
app.use('/api/clients', proxyRequest(CLIENT_URL));
app.use('/api/barcodes', proxyRequest(BARCODE_URL));
app.use('/api/scan', proxyRequest(BARCODE_URL));

// --- Health check & 404 ---
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] API Gateway listening on port ${PORT}`);
});
