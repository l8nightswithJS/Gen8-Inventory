const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'shared-auth-test-secret-that-is-long-enough';
process.env.JWT_ISSUER = 'gen8-inventory-auth';

const verifyJwt = require('../verifyJwt');
const requireClientPermission = require('../requireClientPermission');
const requireInternalGateway = require('../requireInternalGateway');

const { accessMapFromUser } = requireClientPermission._test;

test('legacy client_ids are read-only rather than edit-capable', () => {
  const access = accessMapFromUser({ client_ids: [7, 8] });
  assert.equal(access.get(7), 'read');
  assert.equal(access.get(8), 'read');
});

test('explicit client_access preserves exact permissions', () => {
  const access = accessMapFromUser({
    client_ids: [1, 2],
    client_access: [
      { client_id: 1, access_level: 'read' },
      { client_id: 2, access_level: 'edit' },
    ],
  });
  assert.equal(access.get(1), 'read');
  assert.equal(access.get(2), 'edit');
});

test('JWT verifier enforces the configured issuer', () => {
  const valid = jwt.sign(
    { id: 'user-1' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', issuer: process.env.JWT_ISSUER, expiresIn: '5m' },
  );
  assert.equal(verifyJwt(valid).id, 'user-1');

  const wrongIssuer = jwt.sign(
    { id: 'user-1' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', issuer: 'other-app', expiresIn: '5m' },
  );
  assert.throws(() => verifyJwt(wrongIssuer), /Invalid or expired token/);
});

test('gateway key comparison requires an exact constant-time match', () => {
  const { safeEqual } = requireInternalGateway._test;
  assert.equal(safeEqual('secret-value', 'secret-value'), true);
  assert.equal(safeEqual('secret-value', 'wrong-value'), false);
  assert.equal(safeEqual('', 'secret-value'), false);
});
