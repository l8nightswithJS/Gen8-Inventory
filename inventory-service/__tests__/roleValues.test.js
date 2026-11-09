const express = require('express');
const request = require('supertest');
const { denyViewerWrites } = require('shared-auth');

jest.mock('../../auth-service/controllers/userController', () => {
  const read = (_req, res) => res.json([]);
  return {
    getAllUsers: read,
    getPendingUsers: read,
    getUserClients: read,
    approveUser: (_req, res) => res.json({ ok: true }),
    updateUserClients: (_req, res) => res.json({ ok: true }),
    updateUser: (req, res) => res.json({ role: req.body.role }),
    deleteUser: (_req, res) => res.status(204).send(),
  };
});

const userRoutes = require('../../auth-service/routes/users');

describe('user role validation matches database constraint', () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'test-admin', role: 'admin', approved: true };
    next();
  });
  app.use('/api/users', userRoutes);

  const userId = '11111111-1111-4111-8111-111111111111';

  test.each(['admin', 'inventory_staff', 'project_user', 'external_viewer'])(
    'accepts supported role %s',
    async (role) => {
      const response = await request(app)
        .put('/api/users/' + userId)
        .send({ role });
      expect(response.status).toBe(200);
      expect(response.body.role).toBe(role);
    },
  );

  test.each(['staff', 'owner', ''])(
    'rejects unsupported role %s',
    async (role) => {
      const response = await request(app)
        .put('/api/users/' + userId)
        .send({ role });
      expect(response.status).toBe(400);
    },
  );
});

describe('external viewer write protection', () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'test-viewer', role: 'external_viewer', approved: true };
    next();
  });
  app.use('/api/items', denyViewerWrites);
  app.use('/api/clients', denyViewerWrites);
  app.get('/api/items', (_req, res) => res.json([]));
  app.get('/api/clients', (_req, res) => res.json([]));
  app.post('/api/items', (_req, res) => res.json({ ok: true }));
  app.put('/api/items/5', (_req, res) => res.json({ ok: true }));
  app.delete('/api/items/5', (_req, res) => res.json({ ok: true }));
  app.post('/api/clients/add', (_req, res) => res.json({ ok: true }));

  test('allows read-only GET requests', async () => {
    expect((await request(app).get('/api/items')).status).toBe(200);
    expect((await request(app).get('/api/clients')).status).toBe(200);
  });

  test('rejects inventory POST, PUT, and DELETE', async () => {
    expect((await request(app).post('/api/items').send({})).status).toBe(403);
    expect((await request(app).put('/api/items/5').send({})).status).toBe(403);
    expect((await request(app).delete('/api/items/5')).status).toBe(403);
  });

  test('rejects client write operations', async () => {
    expect((await request(app).post('/api/clients/add').send({})).status).toBe(403);
  });
});
