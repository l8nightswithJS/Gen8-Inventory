process.env.SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');

const pool = require('../db/pool');
const controller = require('../controllers/clientsController');
const router = require('../routes/clients');
const { requireClientMatch } = require('shared-auth');

const serial = { concurrency: false };

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function withPoolQuery(mockQuery, run) {
  const originalQuery = pool.query;
  pool.query = mockQuery;

  try {
    await run();
  } finally {
    pool.query = originalQuery;
  }
}

test(
  'client resource routes require explicit tenant-scope middleware',
  serial,
  () => {
    for (const method of ['get', 'put', 'delete']) {
      const layer = router.stack.find(
        (candidate) =>
          candidate.route?.path === '/:clientId' &&
          candidate.route.methods[method],
      );

      assert.ok(layer, `Missing ${method.toUpperCase()} /:clientId route`);

      const handlers = layer.route.stack.map((entry) => entry.handle);
      assert.ok(
        handlers.includes(requireClientMatch),
        `${method.toUpperCase()} /:clientId must use requireClientMatch`,
      );
    }
  },
);

test('getClientById rejects an invalid client ID', serial, async () => {
  let queryCalled = false;

  await withPoolQuery(
    async () => {
      queryCalled = true;
      throw new Error('Database query must not run');
    },
    async () => {
      const req = {
        params: { clientId: 'invalid' },
        user: { id: 'user-1' },
      };
      const res = createResponseRecorder();

      await controller.getClientById(req, res, assert.fail);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Invalid id' });
      assert.equal(queryCalled, false);
    },
  );
});

test('getClientById requires an authenticated user', serial, async () => {
  let queryCalled = false;

  await withPoolQuery(
    async () => {
      queryCalled = true;
      throw new Error('Database query must not run');
    },
    async () => {
      const req = {
        params: { clientId: '42' },
        user: undefined,
      };
      const res = createResponseRecorder();

      await controller.getClientById(req, res, assert.fail);

      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { message: 'Authentication error' });
      assert.equal(queryCalled, false);
    },
  );
});

test(
  'getClientById returns a client assigned to the authenticated user',
  serial,
  async () => {
    const expectedClient = {
      id: 42,
      name: 'Assigned Client',
    };

    await withPoolQuery(
      async (sql, params) => {
        assert.match(sql, /JOIN user_clients uc ON uc\.client_id = c\.id/);
        assert.match(sql, /c\.id = \$1 AND uc\.user_id = \$2/);
        assert.deepEqual(params, [42, 'user-1']);

        return {
          rows: [expectedClient],
        };
      },
      async () => {
        const req = {
          params: { clientId: '42' },
          user: { id: 'user-1' },
        };
        const res = createResponseRecorder();

        await controller.getClientById(req, res, assert.fail);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, expectedClient);
      },
    );
  },
);

test(
  'getClientById hides clients not assigned to the authenticated user',
  serial,
  async () => {
    await withPoolQuery(
      async (_sql, params) => {
        assert.deepEqual(params, [99, 'user-1']);
        return { rows: [] };
      },
      async () => {
        const req = {
          params: { clientId: '99' },
          user: { id: 'user-1' },
        };
        const res = createResponseRecorder();

        await controller.getClientById(req, res, assert.fail);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { message: 'Client not found' });
      },
    );
  },
);
