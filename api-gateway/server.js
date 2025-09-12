// In api-gateway/server.js

import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

// --- REMOVE PROXY MIDDLEWARE ---
// import { createProxyMiddleware } from 'http-proxy-middleware';
// import Agent from 'agentkeepalive';

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

// ... (keep your existing cors setup) ...

app.use(express.json());
app.use(morgan('tiny'));

// --- NEW PROXY FUNCTION ---
const proxyRequest = (targetUrl) => async (req, res) => {
  try {
    const target = new URL(req.originalUrl, targetUrl);

    const headers = { ...req.headers };
    // The host header must match the target service for internal routing.
    headers.host = target.host;

    const response = await fetch(target, {
      method: req.method,
      headers,
      // Only include a body for relevant methods
      body:
        req.method !== 'GET' && req.method !== 'HEAD'
          ? JSON.stringify(req.body)
          : undefined,
    });

    // Forward the headers from the service back to the client
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    // Send the response
    res.status(response.status).send(await response.buffer());
  } catch (error) {
    console.error('[PROXY] Error forwarding request:', error);
    res.status(502).json({ error: 'Bad Gateway' });
  }
};

// --- Routes (use the new proxy function) ---
app.use('/api/auth', proxyRequest(AUTH_URL));
app.use('/api/users', proxyRequest(AUTH_URL));
app.use('/api/items', proxyRequest(INVENTORY_URL));
app.use('/api/inventory', proxyRequest(INVENTORY_URL));
app.use('/api/clients', proxyRequest(CLIENT_URL));
app.use('/api/barcodes', proxyRequest(BARCODE_URL));
app.use('/api/scan', proxyRequest(BARCODE_URL));

// ... (keep your healthz, 404 handler, and app.listen) ...
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GW] API Gateway listening on port ${PORT}`);
});
