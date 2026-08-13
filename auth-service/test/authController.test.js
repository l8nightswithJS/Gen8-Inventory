process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
process.env.JWT_ISSUER = 'gen8-inventory-auth';
process.env.JWT_TTL = '1h';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { sbAuth, sbAdmin } = require('../lib/supabaseClient');
const {
  register,
  login,
  verifyToken,
  me,
  logout,
} = require('../controllers/authController');
const refreshSession = require('../controllers/refreshController');

const serial = { concurrency: false };

function responseRecorder() {
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

function applicationQueries({ userId, profile, links }) {
  return (table) => {
    if (table === 'users') {
      return {
        select(columns) {
          assert.equal(columns, 'id, role, approved, first_name, last_name');
          return this;
        },
        eq(column, value) {
          assert.equal(column, 'id');
          assert.equal(value, userId);
          return this;
        },
        async single() {
          return { data: profile, error: null };
        },
      };
    }

    if (table === 'user_clients') {
      return {
        select(columns) {
          assert.equal(columns, 'client_id, access_level');
          return this;
        },
        eq(column, value) {
          assert.equal(column, 'user_id');
          assert.equal(value, userId);
          return Promise.resolve({ data: links, error: null });
        },
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  };
}

async function withMocks({ signInWithPassword, from }, run) {
  const originals = {
    signInWithPassword: sbAuth.auth.signInWithPassword,
    from: sbAdmin.from,
    consoleError: console.error,
  };

  try {
    if (signInWithPassword) sbAuth.auth.signInWithPassword = signInWithPassword;
    if (from) sbAdmin.from = from;
    console.error = () => {};
    await run();
  } finally {
    sbAuth.auth.signInWithPassword = originals.signInWithPassword;
    sbAdmin.from = originals.from;
    console.error = originals.consoleError;
  }
}

test('public registration stays disabled', serial, async () => {
  const res = responseRecorder();
  await register({ body: { role: 'admin' } }, res);
  assert.equal(res.statusCode, 403);
});

test('login returns exact read/edit client assignments', serial, async () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  await withMocks(
    {
      signInWithPassword: async ({ email, password }) => {
        assert.equal(email, 'user@example.com');
        assert.equal(password, 'Password123!');
        return {
          data: { user: { id: userId, email } },
          error: null,
        };
      },
      from: applicationQueries({
        userId,
        profile: {
          id: userId,
          role: 'project_user',
          approved: true,
          first_name: 'Eddie',
          last_name: 'Jimenez',
        },
        links: [
          { client_id: 10, access_level: 'read' },
          { client_id: 20, access_level: 'edit' },
        ],
      }),
    },
    async () => {
      const req = {
        body: { email: ' User@Example.com ', password: 'Password123!' },
      };
      const res = responseRecorder();
      await login(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body.user.client_access, [
        { client_id: 10, access_level: 'read' },
        { client_id: 20, access_level: 'edit' },
      ]);
      assert.deepEqual(res.body.user.client_ids, [10, 20]);
      assert.equal(res.body.user.full_name, 'Eddie Jimenez');

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER,
      });
      assert.deepEqual(decoded.client_access, res.body.user.client_access);
    },
  );
});

test('session refresh preserves read-only assignments', serial, async () => {
  const userId = '22222222-2222-4222-8222-222222222222';

  await withMocks(
    {
      from: applicationQueries({
        userId,
        profile: {
          id: userId,
          role: 'inventory_staff',
          approved: true,
          first_name: 'Read',
          last_name: 'Only',
        },
        links: [{ client_id: 33, access_level: 'read' }],
      }),
    },
    async () => {
      const req = { user: { id: userId, email: 'read@example.com' } };
      const res = responseRecorder();
      await refreshSession(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body.user.client_access, [
        { client_id: 33, access_level: 'read' },
      ]);

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER,
      });
      assert.equal(decoded.client_access[0].access_level, 'read');
    },
  );
});

test('verify and me return only validated token identity', serial, async () => {
  const token = jwt.sign(
    { id: 'abc', role: 'project_user', client_ids: [1] },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', issuer: process.env.JWT_ISSUER, expiresIn: '5m' },
  );

  const verifyRes = responseRecorder();
  await verifyToken({ body: { token }, headers: {} }, verifyRes);
  assert.equal(verifyRes.statusCode, 200);
  assert.equal(verifyRes.body.user.id, 'abc');

  const meRes = responseRecorder();
  await me({ user: verifyRes.body.user }, meRes);
  assert.equal(meRes.body.user.role, 'project_user');
});

test('logout is stateless and succeeds', serial, async () => {
  const res = responseRecorder();
  await logout({}, res);
  assert.deepEqual(res.body, { ok: true });
});
