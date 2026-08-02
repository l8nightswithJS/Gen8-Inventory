process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_ISSUER = 'gen8-inventory-auth';
process.env.JWT_TTL = '12h';

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

async function withMocks(overrides, run) {
  const originals = {
    signUp: sbAuth.auth.signUp,
    signInWithPassword: sbAuth.auth.signInWithPassword,
    signOut: sbAuth.auth.signOut,
    from: sbAdmin.from,
    consoleLog: console.log,
    consoleError: console.error,
  };

  try {
    if (overrides.signUp) {
      sbAuth.auth.signUp = overrides.signUp;
    }

    if (overrides.signInWithPassword) {
      sbAuth.auth.signInWithPassword = overrides.signInWithPassword;
    }

    if (overrides.signOut) {
      sbAuth.auth.signOut = overrides.signOut;
    }

    if (overrides.from) {
      sbAdmin.from = overrides.from;
    }

    console.log = () => {};
    console.error = () => {};

    await run();
  } finally {
    sbAuth.auth.signUp = originals.signUp;
    sbAuth.auth.signInWithPassword = originals.signInWithPassword;
    sbAuth.auth.signOut = originals.signOut;
    sbAdmin.from = originals.from;
    console.log = originals.consoleLog;
    console.error = originals.consoleError;
  }
}

function createUsersQuery(expectedUserId, result) {
  return {
    select(columns) {
      assert.equal(columns, 'id, role, approved');
      return this;
    },

    eq(column, value) {
      assert.equal(column, 'id');
      assert.equal(value, expectedUserId);
      return this;
    },

    async single() {
      return result;
    },
  };
}

function createClientLinksQuery(expectedUserId, result) {
  return {
    select(columns) {
      assert.equal(columns, 'client_id');
      return this;
    },

    eq(column, value) {
      assert.equal(column, 'user_id');
      assert.equal(value, expectedUserId);
      return Promise.resolve(result);
    },
  };
}

test(
  'public registration is disabled regardless of submitted role',
  serial,
  async () => {
    let signUpCalled = false;

    await withMocks(
      {
        signUp: async () => {
          signUpCalled = true;
          throw new Error('signUp must not be called');
        },
      },
      async () => {
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
        assert.equal(signUpCalled, false);
        assert.deepEqual(res.body, {
          message:
            'Self-registration is disabled. Contact an administrator.',
        });
      },
    );
  },
);

test(
  'login rejects requests missing email or password',
  serial,
  async () => {
    let signInCalled = false;

    await withMocks(
      {
        signInWithPassword: async () => {
          signInCalled = true;
          throw new Error('signIn must not be called');
        },
      },
      async () => {
        const req = {
          body: {
            email: '',
            password: '',
          },
        };

        const res = createResponseRecorder();

        await login(req, res);

        assert.equal(res.statusCode, 400);
        assert.equal(signInCalled, false);
        assert.deepEqual(res.body, {
          message: 'Missing email or password',
        });
      },
    );
  },
);

test(
  'login rejects invalid Supabase credentials',
  serial,
  async () => {
    await withMocks(
      {
        signInWithPassword: async ({ email, password }) => {
          assert.equal(email, 'invalid@example.com');
          assert.equal(password, 'WrongPassword123!');

          return {
            data: {
              user: null,
            },
            error: {
              message: 'Invalid login credentials',
            },
          };
        },
      },
      async () => {
        const req = {
          body: {
            email: ' Invalid@Example.com ',
            password: 'WrongPassword123!',
          },
        };

        const res = createResponseRecorder();

        await login(req, res);

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, {
          message: 'Invalid email or password',
        });
      },
    );
  },
);

test(
  'login rejects an authenticated user without an application profile',
  serial,
  async () => {
    const userId = '00000000-0000-0000-0000-000000000001';
    const queriedTables = [];

    await withMocks(
      {
        signInWithPassword: async ({ email, password }) => {
          assert.equal(email, 'unprovisioned@example.com');
          assert.equal(password, 'TestPassword123!');

          return {
            data: {
              user: {
                id: userId,
                email,
              },
            },
            error: null,
          };
        },

        from: (table) => {
          queriedTables.push(table);
          assert.equal(table, 'users');

          return createUsersQuery(userId, {
            data: null,
            error: {
              code: 'PGRST116',
              message: 'No profile row found',
            },
          });
        },
      },
      async () => {
        const req = {
          body: {
            email: ' Unprovisioned@Example.com ',
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
      },
    );
  },
);

test(
  'login rejects a provisioned account that is not approved',
  serial,
  async () => {
    const userId = '00000000-0000-0000-0000-000000000002';
    const queriedTables = [];

    await withMocks(
      {
        signInWithPassword: async ({ email }) => ({
          data: {
            user: {
              id: userId,
              email,
            },
          },
          error: null,
        }),

        from: (table) => {
          queriedTables.push(table);
          assert.equal(table, 'users');

          return createUsersQuery(userId, {
            data: {
              id: userId,
              role: 'staff',
              approved: false,
            },
            error: null,
          });
        },
      },
      async () => {
        const req = {
          body: {
            email: 'pending@example.com',
            password: 'TestPassword123!',
          },
        };

        const res = createResponseRecorder();

        await login(req, res);

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
          message: 'Account pending approval',
        });
        assert.deepEqual(queriedTables, ['users']);
      },
    );
  },
);

test(
  'login fails safely when client assignments cannot be retrieved',
  serial,
  async () => {
    const userId = '00000000-0000-0000-0000-000000000003';

    await withMocks(
      {
        signInWithPassword: async ({ email }) => ({
          data: {
            user: {
              id: userId,
              email,
            },
          },
          error: null,
        }),

        from: (table) => {
          if (table === 'users') {
            return createUsersQuery(userId, {
              data: {
                id: userId,
                role: 'staff',
                approved: true,
              },
              error: null,
            });
          }

          if (table === 'user_clients') {
            return createClientLinksQuery(userId, {
              data: null,
              error: {
                message: 'Client lookup failed',
              },
            });
          }

          throw new Error(`Unexpected table: ${table}`);
        },
      },
      async () => {
        const req = {
          body: {
            email: 'staff@example.com',
            password: 'TestPassword123!',
          },
        };

        const res = createResponseRecorder();

        await login(req, res);

        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, {
          message: 'Login failed',
        });
      },
    );
  },
);

test(
  'approved provisioned user receives a signed application token',
  serial,
  async () => {
    const userId = '00000000-0000-0000-0000-000000000004';

    await withMocks(
      {
        signInWithPassword: async ({ email, password }) => {
          assert.equal(email, 'approved@example.com');
          assert.equal(password, 'TestPassword123!');

          return {
            data: {
              user: {
                id: userId,
                email,
                user_metadata: {
                  role: 'admin',
                },
              },
            },
            error: null,
          };
        },

        from: (table) => {
          if (table === 'users') {
            return createUsersQuery(userId, {
              data: {
                id: userId,
                role: 'staff',
                approved: true,
              },
              error: null,
            });
          }

          if (table === 'user_clients') {
            return createClientLinksQuery(userId, {
              data: [
                { client_id: 11 },
                { client_id: 22 },
              ],
              error: null,
            });
          }

          throw new Error(`Unexpected table: ${table}`);
        },
      },
      async () => {
        const req = {
          body: {
            email: ' Approved@Example.com ',
            password: 'TestPassword123!',
          },
        };

        const res = createResponseRecorder();

        await login(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(typeof res.body.token, 'string');

        assert.deepEqual(res.body.user, {
          id: userId,
          role: 'staff',
          email: 'approved@example.com',
          approved: true,
          client_ids: [11, 22],
        });

        const decoded = jwt.verify(
          res.body.token,
          process.env.JWT_SECRET,
        );

        assert.equal(decoded.id, userId);
        assert.equal(decoded.role, 'staff');
        assert.equal(decoded.email, 'approved@example.com');
        assert.equal(decoded.approved, true);
        assert.deepEqual(decoded.client_ids, [11, 22]);
        assert.equal(decoded.iss, 'gen8-inventory-auth');

        // The public.users role must override untrusted auth metadata.
        assert.notEqual(decoded.role, 'admin');
      },
    );
  },
);

test(
  'verifyToken accepts a valid application token',
  serial,
  async () => {
    const token = jwt.sign(
      {
        id: 'verified-user',
        role: 'staff',
        approved: true,
        client_ids: [7],
      },
      process.env.JWT_SECRET,
      {
        issuer: process.env.JWT_ISSUER,
        expiresIn: '5m',
      },
    );

    const req = {
      body: {
        token,
      },
      headers: {},
    };

    const res = createResponseRecorder();

    await verifyToken(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.user.id, 'verified-user');
    assert.equal(res.body.user.role, 'staff');
    assert.deepEqual(res.body.user.client_ids, [7]);
  },
);

test(
  'verifyToken rejects an invalid token',
  serial,
  async () => {
    const req = {
      body: {
        token: 'not-a-valid-token',
      },
      headers: {},
    };

    const res = createResponseRecorder();

    await verifyToken(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      message: 'Invalid token',
    });
  },
);

test(
  'me returns the authenticated request user',
  serial,
  async () => {
    const req = {
      user: {
        id: 'current-user',
        role: 'admin',
        approved: true,
        client_ids: [],
      },
      headers: {},
    };

    const res = createResponseRecorder();

    await me(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      user: req.user,
    });
  },
);

test(
  'logout returns success even when Supabase sign-out fails',
  serial,
  async () => {
    let signOutCalls = 0;

    await withMocks(
      {
        signOut: async () => {
          signOutCalls += 1;
          throw new Error('Simulated sign-out failure');
        },
      },
      async () => {
        const res = createResponseRecorder();

        await logout({}, res);

        assert.equal(signOutCalls, 1);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, {
          ok: true,
        });
      },
    );
  },
);