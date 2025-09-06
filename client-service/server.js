// client-service/server.js
const {
  authMiddleware,
  requireRole,
  requireClientMatch,
  handleValidation,
} = require('shared-auth');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const clientsRouter = require('./routes/clients');

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Protect API routes (except health)

// Serve uploaded logos
app.use('/', authMiddleware, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/', authMiddleware, clientsRouter);

const PORT = Number(process.env.PORT) || 8003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Client service listening on :${PORT}`);
});
