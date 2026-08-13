jest.mock('../db/pool', () => ({
  query: jest.fn(),
}));

const pool = require('../db/pool');
const controller = require('../controllers/inventoryController');

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

describe('inventory controller item contract', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('createItem writes core fields and one flat attributes object', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: 41, part_number: 'P-100' }],
    });

    const req = {
      body: {
        client_id: '7',
        part_number: ' P-100 ',
        reorder_level: '20',
        attributes: { color: 'clear' },
        cavity: 8,
        total_quantity: 500,
      },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await controller.createItem(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO items');
    expect(sql).toContain('"client_id"');
    expect(sql).toContain('"part_number"');
    expect(sql).toContain('"attributes"');
    expect(values).toContain(7);
    expect(values).toContain('P-100');
    expect(values).toContain(20);

    const parsedAttributes = JSON.parse(values[values.length - 1]);
    expect(parsedAttributes).toEqual({
      color: 'clear',
      cavity: 8,
    });
    expect(parsedAttributes).not.toHaveProperty('attributes');
    expect(parsedAttributes).not.toHaveProperty('total_quantity');
  });

  test('updateItem replaces attributes and strips read-only fields', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            reorder_level: 5,
            low_stock_threshold: 3,
            alert_enabled: true,
            alert_acknowledged_at: null,
            total_quantity: 10,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 41, part_number: 'P-200', attributes: { cavity: 4 } }],
      });

    const req = {
      params: { id: '41' },
      body: {
        id: 41,
        client_id: 99,
        part_number: ' P-200 ',
        total_quantity: 999,
        status: 'out_of_stock',
        attributes: { cavity: 4 },
      },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await controller.updateItem(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);

    const [sql, values] = pool.query.mock.calls[1];
    expect(sql).toContain('"part_number" = $1');
    expect(sql).toContain('attributes = $2::jsonb');
    expect(sql).not.toContain('total_quantity');
    expect(sql).not.toContain('client_id');
    expect(values[0]).toBe('P-200');
    expect(JSON.parse(values[1])).toEqual({ cavity: 4 });
    expect(values[2]).toBe(41);
  });

  test('updateItem accepts an empty attributes object to remove custom fields', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            reorder_level: null,
            low_stock_threshold: null,
            alert_enabled: true,
            alert_acknowledged_at: null,
            total_quantity: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 41, attributes: {} }] });

    const req = {
      params: { id: '41' },
      body: { attributes: {} },
    };
    const res = createResponseRecorder();

    await controller.updateItem(req, res, jest.fn());

    const [sql, values] = pool.query.mock.calls[1];
    expect(sql).toContain('attributes = $1::jsonb');
    expect(JSON.parse(values[0])).toEqual({});
  });

  test('updateItem rejects requests with no writable fields', async () => {
    const req = {
      params: { id: '41' },
      body: {
        id: 41,
        client_id: 7,
        total_quantity: 50,
        status: 'in_stock',
      },
    };
    const res = createResponseRecorder();

    await controller.updateItem(req, res, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'No item fields to update.' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('createItem returns a contract error without querying the database', async () => {
    const req = {
      body: {
        client_id: 7,
        part_number: 'P-1',
        reorder_level: '1.2345',
      },
    };
    const res = createResponseRecorder();
    const next = jest.fn();

    await controller.createItem(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('reorder_level');
    expect(pool.query).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
