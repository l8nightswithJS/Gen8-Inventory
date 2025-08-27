require('dotenv').config();
const express = require('express');
const cors = require('cors');
// THIS LINE IS THE FIX: Use the older import style
const proxy = require('http-proxy-middleware');

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
// Helper function to create the proxy middleware
const createProxy = (target) => {
  // Use the 'proxy' function directly, as required by the older version
  return proxy({
    target,
    changeOrigin: true,
  });
};

// Define service URLs from environment variables
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://auth-service:8002';
const CLIENT_SERVICE_URL =
  process.env.CLIENT_SERVICE_URL || 'http://client-service:8004';
const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8003';
const BARCODE_SERVICE_URL =
  process.env.BARCODE_SERVICE_URL || 'http://barcode-service:8005';

// Apply the proxies
app.use('/api/auth', createProxy(AUTH_SERVICE_URL));
app.use('/api/users', createProxy(AUTH_SERVICE_URL));
app.use('/api/clients', createProxy(CLIENT_SERVICE_URL));
app.use('/api/items', createProxy(INVENTORY_SERVICE_URL));
app.use('/api/barcodes', createProxy(BARCODE_SERVICE_URL));
app.use('/api/scan', createProxy(BARCODE_SERVICE_URL));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on :${PORT}`);
});
