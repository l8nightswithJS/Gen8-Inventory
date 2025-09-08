require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { authMiddleware } = require('shared-auth');

const clientsRouter = require('./routes/clients');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ service: 'clients', ok: true });
});

// Serve uploaded logos
app.use('/', authMiddleware, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/add', authMiddleware, clientsRouter);

const PORT = Number(process.env.PORT) || 8003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Client service listening on :${PORT}`);
});
