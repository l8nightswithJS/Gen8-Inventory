process.env.SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret';

const test = require('node:test');
const assert = require('node:assert/strict');

const { sbAuth, sbAdmin } = require('../lib/supabaseClient');
const { register, login } = require('../controllers/authController');

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

test('public registration is disabled regardless of submitted role', async () => {
  const req = {
    body: {
      email: 'blocked-test@example.com',
      password: 'TestPassword123!',
      role: 'admin',
    },
  };

  const res = createResponseRecorder();

  await register(req, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    message: 'Self-registration is disabled. Contact an administrator.',
  });
});

test('login rejects an authenticated user without an application profile', async () => {
  const originalSignIn = sbAuth.auth.signInWithPassword;
  const originalFrom = sbAdmin.from;
  const originalLog = console.log;
  const originalError = console.error;

  const authUserId = '00000000-0000-0000-0000-000000000001';
  const queriedTables = [];

  try {
    sbAuth.auth.signInWithPassword = async ({ email, password }) => {
      assert.equal(email, 'unprovisioned@example.com');
      assert.equal(password, 'TestPassword123!');

      return {
        data: {
          user: {
            id: authUserId,
            email,
          },
        },
        error: null,
      };
    };

    sbAdmin.from = (table) => {
      queriedTables.push(table);
      assert.equal(table, 'users');

      return {
        select(columns) {
          assert.equal(columns, 'id, role, approved');
          return this;
        },

        eq(column, value) {
          assert.equal(column, 'id');
          assert.equal(value, authUserId);
          return this;
        },

        async single() {
          return {
            data: null,
            error: {
              code: 'PGRST116',
              message: 'No profile row found',
            },
          };
        },
      };
    };

    console.log = () => {};
    console.error = () => {};

    const req = {
      body: {
        email: '  Unprovisioned@Example.com  ',
        password: 'TestPassword123!',
      },
    };

    const res = createResponseRecorder();

    await login(req, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
      message:
        'Account is not provisioned for this application. Contact an administrator.',
    });

    assert.deepEqual(queriedTables, ['users']);
  } finally {
    sbAuth.auth.signInWithPassword = originalSignIn;
    sbAdmin.from = originalFrom;
    console.log = originalLog;
    console.error = originalError;
  }
});