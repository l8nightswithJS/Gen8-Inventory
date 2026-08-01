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

const { register } = require('../controllers/authController');

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