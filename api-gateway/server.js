require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Use the modern, correct import style
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://gen8-inventory.vercel.app', // Your Vercel URL
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// --- Proxy Routes ---
// Define service URLs from environment variables
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://auth-service:8001';
const CLIENT_SERVICE_URL =
  process.env.CLIENT_SERVICE_URL || 'http://client-service:8003';
const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8000';
const BARCODE_SERVICE_URL =
  process.env.BARCODE_SERVICE_URL || 'http://barcode-service:8002';

// Apply the proxies using the modern 'createProxyMiddleware' function
app.use(
  '/api/auth',
  createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }),
);
app.use(
  '/api/users',
  createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }),
);
app.use(
  '/api/clients',
  createProxyMiddleware({ target: CLIENT_SERVICE_URL, changeOrigin: true }),
);
app.use(
  '/api/items',
  createProxyMiddleware({ target: INVENTORY_SERVICE_URL, changeOrigin: true }),
);
app.use(
  '/api/barcodes',
  createProxyMiddleware({ target: BARCODE_SERVICE_URL, changeOrigin: true }),
);
app.use(
  '/api/scan',
  createProxyMiddleware({ target: BARCODE_SERVICE_URL, changeOrigin: true }),
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on :${PORT}`);
});
