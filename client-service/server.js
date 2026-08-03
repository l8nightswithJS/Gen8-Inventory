require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware, errorHandler } = require('shared-auth');

const pool = require('./db/pool');
const clientsRouter = require('./routes/clients');

const app = express();

app.use(cors());
app.use(express.json());

// Process health: confirms the Node service is running.
app.get('/healthz', (_req, res) => {
  res.json({ service: 'clients', ok: true });
});

// Dependency readiness: confirms Render can authenticate to PostgreSQL.
app.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ service: 'clients', ready: true, database: true });
  } catch (error) {
    console.error('Client service database readiness failed:', {
      code: error.code,
      message: error.message,
    });

    return res.status(503).json({
      service: 'clients',
      ready: false,
      database: false,
      code: error.code || 'DATABASE_UNAVAILABLE',
    });
  }
});

app.use(authMiddleware);
app.use('/api/clients', clientsRouter);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Client service listening on :${PORT}`);
});
