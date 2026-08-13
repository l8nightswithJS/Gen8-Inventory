const test = require('node:test');
const assert = require('node:assert/strict');

const requireClientMatch = require('../requireClientMatch');

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

function runMiddleware(req) {
  const res = createResponseRecorder();
  let nextCalls = 0;

  requireClientMatch(req, res, () => {
    nextCalls += 1;
  });

  return { res, nextCalls };
}

test(
  'allows requests with no explicit client identifier for resource-level authorization',
  () => {
    const { res, nextCalls } = runMiddleware({
      user: { id: 'user-1' },
      params: {},
      query: {},
      body: {},
    });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, 200);
  },
);

test(
  'rejects an explicit client identifier when the token has no client scope array',
  () => {
    const { res, nextCalls } = runMiddleware({
      user: { id: 'user-1' },
      params: {},
      query: { client_id: '12' },
      body: {},
    });

    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
      error: 'Forbidden: Missing client scope in token.',
    });
  },
);

test('allows a matching explicit client_id from query parameters', () => {
  const req = {
    user: { client_ids: [12, 25] },
    params: {},
    query: { client_id: '25' },
    body: {},
  };

  const { res, nextCalls } = runMiddleware(req);

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, 200);
  assert.equal(req.clientId, 25);
});

test('normalizes numeric client IDs stored as strings in the token', () => {
  const req = {
    user: { client_ids: ['7'] },
    params: { clientId: '7' },
    query: {},
    body: {},
  };

  const { nextCalls } = runMiddleware(req);

  assert.equal(nextCalls, 1);
  assert.equal(req.clientId, 7);
});

test('hides an explicit client outside the token scope as not found', () => {
  const { res, nextCalls } = runMiddleware({
    user: { client_ids: [10] },
    params: {},
    query: { client_id: '11' },
    body: {},
  });

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    error: 'Resource not found.',
  });
});

test('rejects malformed explicit client IDs', () => {
  const { res, nextCalls } = runMiddleware({
    user: { client_ids: [1] },
    params: {},
    query: { client_id: '1abc' },
    body: {},
  });

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: 'Invalid client ID format in request.',
  });
});

test('rejects zero, negative, decimal, and unsafe client IDs', () => {
  for (const value of ['0', '-1', '1.5', '9007199254740992']) {
    const { res, nextCalls } = runMiddleware({
      user: { client_ids: [1] },
      params: {},
      query: { client_id: value },
      body: {},
    });

    assert.equal(nextCalls, 0, value);
    assert.equal(res.statusCode, 400, value);
  }
});

test('rejects conflicting client IDs from multiple request sources', () => {
  const { res, nextCalls } = runMiddleware({
    user: { client_ids: [2, 3] },
    params: { clientId: '2' },
    query: { client_id: '3' },
    body: {},
  });

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: 'Conflicting client IDs in request.',
  });
});

test('allows duplicate matching client IDs across request sources', () => {
  const req = {
    user: { client_ids: [4] },
    params: { client_id: '4' },
    query: { clientId: '4' },
    body: { client_id: 4 },
  };

  const { nextCalls } = runMiddleware(req);

  assert.equal(nextCalls, 1);
  assert.equal(req.clientId, 4);
});

test('does not treat generic resource :id as a client ID', () => {
  const req = {
    user: { client_ids: [5] },
    params: { id: '999' },
    query: {},
    body: {},
  };

  const { res, nextCalls } = runMiddleware(req);

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, 200);
  assert.equal(req.clientId, undefined);
});

test(
  'allows routes with no explicit client identifier for resource-level checks',
  () => {
    const { res, nextCalls } = runMiddleware({
      user: { client_ids: [] },
      params: {},
      query: {},
      body: {},
    });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, 200);
  },
);