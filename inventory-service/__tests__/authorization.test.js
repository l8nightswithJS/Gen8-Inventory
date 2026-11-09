const pool = require('../db/pool');
const authorizeInventory = require('../middleware/authorizeInventory');
const requireClientMatch = require('../../packages/shared-auth/requireClientMatch');

jest.mock('../db/pool', () => ({ query: jest.fn() }));

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('project-scoped authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  test('explicit client scope refuses access to other projects', () => {
    const req = { user: { client_ids: [1] }, params: {}, query: { client_id: '2' }, body: {} };
    const res = response(), next = jest.fn();
    requireClientMatch(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('explicit client scope accepts authorized project', () => {
    const req = { user: { client_ids: [1] }, params: {}, query: { client_id: '1' }, body: {} };
    const res = response(), next = jest.fn();
    requireClientMatch(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('item ID must not be mistaken for a client ID', () => {
    const req = { user: { client_ids: [1] }, params: { id: '99' }, query: {}, body: {} };
    const res = response(), next = jest.fn();
    requireClientMatch(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('denies reading an item belonging to an unassigned project', async () => {
    pool.query.mockResolvedValue({ rows: [{ client_id: 2 }] });
    const req = { path: '/99', user: { client_ids: [1] }, body: {} };
    const res = response(), next = jest.fn();
    await authorizeInventory(req, res, next);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT client_id FROM items WHERE id = $1',
      [99],
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows an assigned project item', async () => {
    pool.query.mockResolvedValue({ rows: [{ client_id: 1 }] });
    const req = { path: '/99', user: { client_ids: [1] }, body: {} };
    const res = response(), next = jest.fn();
    await authorizeInventory(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('blocks stock adjustment for a foreign project item', async () => {
    pool.query.mockResolvedValue({ rows: [{ client_id: 2 }] });
    const req = { path: '/adjust', user: { client_ids: [1] }, body: { item_id: 99 } };
    const res = response(), next = jest.fn();
    await authorizeInventory(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('rejects malformed item IDs', async () => {
    const req = { path: '/adjust', user: { client_ids: [1] }, body: { item_id: 'nope' } };
    const res = response(), next = jest.fn();
    await authorizeInventory(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('does not block the separately admin-protected global view', async () => {
    const req = { path: '/by-location', user: { client_ids: [] }, body: {} };
    const res = response(), next = jest.fn();
    await authorizeInventory(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
