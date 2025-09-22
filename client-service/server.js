// In client-service/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware, requireClientMatch } = require('shared-auth');

const clientsRouter = require('./routes/clients');

const app = express();

app.use(cors());
app.use(express.json());

// --- Public Routes ---
app.get('/healthz', (_req, res) => {
  res.json({ service: 'clients', ok: true });
});

// --- Security Middleware ---
app.use(authMiddleware);
// Note: requireClientMatch might need to be evaluated if it interferes with creating new clients,
// but for now we assume it's configured correctly.

// --- Protected Routes ---
app.use('/api/clients', clientsRouter);

const PORT = Number(process.env.PORT) || 8003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Client service listening on :${PORT}`);
});
