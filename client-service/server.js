require('dotenv').config();
const express = require('express');
const {
  authMiddleware,
  errorHandler,
  requireInternalGateway,
} = require('shared-auth');

const pool = require('./db/pool');
const clientsRouter = require('./routes/clients');

const app = express();
app.set('etag', false);
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.get('/healthz', (_req, res) => {
  res.json({ service: 'clients', ok: true });
});

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
      code: 'DATABASE_UNAVAILABLE',
    });
  }
});

app.use(requireInternalGateway);
app.use(authMiddleware);
app.use('/api/clients', clientsRouter);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Client service listening on :${PORT}`);
});
