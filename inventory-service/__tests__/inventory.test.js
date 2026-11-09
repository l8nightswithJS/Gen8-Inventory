// inventory-service/__tests__/inventory.test.js
// HTTP-level route tests with an isolated database. No production data is used.
jest.mock('../db/pool', () => ({ query: jest.fn() }));

const request = require('supertest');
const express = require('express');
const pool = require('../db/pool');
const { requireClientMatch } = require('shared-auth');
const inventoryRoutes = require('../routes/inventory');

const app = express();
app.use(express.json());
// Test-only authenticated identity; production authMiddleware is tested separately.
app.use((req, _res, next) => {
  req.user = {
    id: 'test-user',
    role: 'staff',
    approved: true,
    client_ids: [1],
  };
  next();
});
// Preserve the same explicit client-scope middleware as the inventory service.
app.use('/api/items', requireClientMatch, inventoryRoutes);
app.use((err, _req, res, _next) => {
  res.status(500).json({ message: err.message });
});

describe('Inventory HTTP routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/items lists assigned project inventory using aggregated stock', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 42,
          client_id: 1,
          name: 'Resin',
          part_number: 'RESIN-001',
          total_quantity: 6,
          low_stock_threshold: 10,
        },
      ],
    });

    const response = await request(app).get('/api/items?client_id=1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 42,
        total_quantity: 6,
        status: 'low_stock',
      }),
    ]);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('rejects listing another project without querying the database', async () => {
    const response = await request(app).get('/api/items?client_id=2');
    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects an invalid client ID', async () => {
    const response = await request(app).get('/api/items?client_id=invalid');
    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('uses the export route instead of treating "export" as an item ID', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 42,
          client_id: 1,
          name: 'Resin',
          part_number: 'RESIN-001',
          attributes: {},
        },
      ],
    });

    const response = await request(app).get('/api/items/export?client_id=1');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.text).toContain('RESIN-001');
  });

  it('rejects access to an item owned by a different project', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ client_id: 2 }] });

    const response = await request(app).get('/api/items/99');

    expect(response.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('returns an item when its owning project is assigned to the user', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ client_id: 1 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 42, client_id: 1, name: 'Resin', inventory_levels: [] }],
      });

    const response = await request(app).get('/api/items/42');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 42,
      client_id: 1,
      name: 'Resin',
    });
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});
