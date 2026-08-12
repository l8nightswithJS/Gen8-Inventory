const test = require('node:test');
const assert = require('node:assert/strict');

const pool = require('../db/pool');
const controller = require('../controllers/barcodesController');

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

async function withQueries(results, run) {
  const original = pool.query;
  const calls = [];
  pool.query = async (text, params) => {
    calls.push({ text, params });
    const result = results.shift();
    if (!result) throw new Error('Unexpected query');
    return result;
  };

  try {
    await run(calls);
  } finally {
    pool.query = original;
  }
}

test('lookup always scopes the barcode and item to the requested client', serial, async () => {
  await withQueries(
    [
      {
        rowCount: 1,
        rows: [{
          id: 5,
          client_id: 7,
          item_id: 20,
          barcode: 'ABC123',
          symbology: 'CODE128',
          created_at: null,
        }],
      },
      {
        rowCount: 1,
        rows: [{ id: 20, client_id: 7, attributes: { lot: 'A' } }],
      },
    ],
    async (calls) => {
      const req = { query: { code: 'ABC123', client_id: '7' } };
      const res = responseRecorder();
      await controller.lookup(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 200);
      assert.deepEqual(calls[0].params, ['ABC123', 7]);
      assert.deepEqual(calls[1].params, [20, 7]);
      assert.equal(res.body.mapping.client_id, 7);
      assert.equal(res.body.item.client_id, 7);
    },
  );
});

test('item barcode listing returns 404 when item is not owned by client', serial, async () => {
  await withQueries(
    [{ rowCount: 0, rows: [] }],
    async (calls) => {
      const req = { params: { id: '20' }, query: { client_id: '8' } };
      const res = responseRecorder();
      await controller.listForItem(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 404);
      assert.deepEqual(calls[0].params, [20, 8]);
      assert.deepEqual(res.body, { message: 'Resource not found.' });
    },
  );
});

test('barcode assignment rejects cross-client item mappings', serial, async () => {
  await withQueries(
    [{ rowCount: 0, rows: [] }],
    async (calls) => {
      const req = {
        body: {
          client_id: 9,
          item_id: 30,
          barcode: 'XYZ',
          symbology: 'CODE128',
        },
      };
      const res = responseRecorder();
      await controller.assign(req, res, (error) => { throw error; });

      assert.equal(res.statusCode, 404);
      assert.deepEqual(calls[0].params, [30, 9]);
    },
  );
});
