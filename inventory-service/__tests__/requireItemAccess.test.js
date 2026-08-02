jest.mock('../db/pool', () => ({
  query: jest.fn(),
}));

const pool = require('../db/pool');
const {
  requireItemAccess,
  requireItemListAccess,
} = require('../middleware/requireItemAccess');

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

describe('inventory item authorization middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects tokens without a client scope array', async () => {
    const req = {
      user: { id: 'user-1' },
      params: { id: '10' },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await requireItemAccess()(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      message: 'Forbidden: Missing client scope in token.',
    });
    expect(pool.query).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('allows an item assigned to a client in the token scope', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: '10', client_id: '7' }],
    });

    const req = {
      user: { id: 'user-1', client_ids: ['7'] },
      params: { id: '10' },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await requireItemAccess()(req, res, next);

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, client_id FROM items WHERE id = $1',
      [10],
    );
    expect(req.itemId).toBe(10);
    expect(req.itemClientId).toBe(7);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  test('hides an item assigned to another client', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: 10, client_id: 99 }],
    });

    const req = {
      user: { id: 'user-1', client_ids: [7] },
      params: { id: 10 },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await requireItemAccess()(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Item not found' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns the same response when the item does not exist', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const req = {
      user: { id: 'user-1', client_ids: [7] },
      params: { id: 404 },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await requireItemAccess()(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Item not found' });
    expect(next).not.toHaveBeenCalled();
  });

  test('can resolve an item ID from the request body', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: 25, client_id: 8 }],
    });

    const req = {
      user: { id: 'user-1', client_ids: [8] },
      body: { item_id: '25' },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await requireItemAccess({ source: 'body', key: 'item_id' })(
      req,
      res,
      next,
    );

    expect(req.itemId).toBe(25);
    expect(req.itemClientId).toBe(8);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejects malformed and unsafe item IDs without querying the database', async () => {
    for (const id of ['0', '-1', '1.5', 'abc', '9007199254740992']) {
      const req = {
        user: { id: 'user-1', client_ids: [7] },
        params: { id },
      };
      const res = createResponseRecorder();
      const next = jest.fn();

      await requireItemAccess()(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid item ID' });
      expect(next).not.toHaveBeenCalled();
    }

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('allows a selected-item list only when every item is in scope', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: '10', client_id: '7' },
        { id: '20', client_id: '8' },
      ],
    });

    const req = {
      user: { id: 'user-1', client_ids: [7, 8] },
      body: { item_ids: ['10', 20, 10] },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await requireItemListAccess()(req, res, next);

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id, client_id FROM items WHERE id = ANY($1::bigint[])',
      [[10, 20]],
    );
    expect(req.itemIds).toEqual([10, 20]);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('hides a selected-item list containing a missing or unauthorized item', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: 10, client_id: 7 },
        { id: 20, client_id: 99 },
      ],
    });

    const req = {
      user: { id: 'user-1', client_ids: [7] },
      body: { item_ids: [10, 20, 30] },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await requireItemListAccess()(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Item not found' });
    expect(next).not.toHaveBeenCalled();
  });

  test('passes database errors to the service error handler', async () => {
    const databaseError = new Error('database unavailable');
    pool.query.mockRejectedValue(databaseError);

    const req = {
      user: { id: 'user-1', client_ids: [7] },
      params: { id: 10 },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await requireItemAccess()(req, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
  });
});
