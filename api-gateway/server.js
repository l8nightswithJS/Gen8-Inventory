require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

// --- Proxy Routes ---

// Auth Service
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '/api/auth' },
  }),
);

// Users (managed by Auth Service)
app.use(
  '/api/users',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/api/users' },
  }),
);

// Client Service
app.use(
  '/api/clients',
  createProxyMiddleware({
    target: process.env.CLIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/clients': '/api/clients' },
  }),
);

// Inventory Service
app.use(
  '/api/items',
  createProxyMiddleware({
    target: process.env.INVENTORY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/items': '/api/items' },
  }),
);

// Barcode Service
app.use(
  '/api/barcodes',
  createProxyMiddleware({
    target: process.env.BARCODE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/barcodes': '/api/barcodes' },
  }),
);

app.use(
  '/api/scan',
  createProxyMiddleware({
    target: process.env.BARCODE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/scan': '/api/scan' },
  }),
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on :${PORT}`);
});
