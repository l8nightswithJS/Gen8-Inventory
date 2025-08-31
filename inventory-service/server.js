require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Remaining core routes
const inventoryRouter = require('./routes/inventory');
const labelsRouter = require('./routes/labels');
const locationsRouter = require('./routes/locations');

const app = express();

app.get('/', (req, res) => {
  res.json({
    message: 'Gener8 Inventory API is running.',
    version: '2.0-login-fix',
  });
});

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
app.use(
  cors({
    origin: FRONTEND_ORIGIN || '*',
    credentials: true,
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Routes are now cleaned up
app.use('/api/items', inventoryRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/locations', locationsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Client service listening on :${PORT}`);
});
