// In client-service/server.js (Corrected and Final Version)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { authMiddleware, requireClientMatch } = require('shared-auth');

const clientsRouter = require('./routes/clients');

const app = express();

app.use(cors());
app.use(express.json());

// --- Public Routes ---
// Health check is public and mounted before security.
app.get('/healthz', (_req, res) => {
  res.json({ service: 'clients', ok: true });
});

// --- Security Middleware ---
// All routes defined after these lines are now protected.
app.use(authMiddleware);
app.use(requireClientMatch);

// --- Protected Routes ---

// Serve uploaded logos from a dedicated, protected path.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount the main API router. It inherits the security checks from above.
app.use('/', clientsRouter);

const PORT = Number(process.env.PORT) || 8003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Client service listening on :${PORT}`);
});
