const request = require('supertest');
const express = require('express');

jest.mock('shared-auth', () => ({
  requireRole: jest.fn(() => (_req, _res, next) => next()),
  handleValidation: (_req, _res, next) => next(),
}));

jest.mock('../middleware/requireItemAccess', () => ({
  requireItemAccess: jest.fn(
    ({ source = 'params', key = 'id' } = {}) =>
      (req, _res, next) => {
        req.itemAccess = { source, key };
        next();
      },
  ),
  requireItemListAccess: jest.fn(() => (req, _res, next) => {
    req.itemListAccess = true;
    next();
  }),
}));

jest.mock('../controllers/inventoryController', () => {
  const makeHandler = (name) => (req, res) =>
    res.json({
      handler: name,
      itemAccess: req.itemAccess || null,
      itemListAccess: req.itemListAccess || false,
    });

  return {
    getMasterInventoryByLocation: makeHandler('getMasterInventoryByLocation'),
    getActiveAlerts: makeHandler('getActiveAlerts'),
    acknowledgeAlert: makeHandler('acknowledgeAlert'),
    listItems: makeHandler('listItems'),
    getItemById: makeHandler('getItemById'),
    createItem: makeHandler('createItem'),
    updateItem: makeHandler('updateItem'),
    deleteItem: makeHandler('deleteItem'),
    adjustInventory: makeHandler('adjustInventory'),
    bulkImportItems: makeHandler('bulkImportItems'),
    exportItems: makeHandler('exportItems'),
  };
});

jest.mock('../controllers/labelsController', () => {
  const makeHandler = (name) => (req, res) =>
    res.json({
      handler: name,
      itemAccess: req.itemAccess || null,
      itemListAccess: req.itemListAccess || false,
    });

  return {
    printAllForClient: makeHandler('printAllForClient'),
    printSelected: makeHandler('printSelected'),
  };
});

const inventoryRoutes = require('../routes/inventory');
const labelsRoutes = require('../routes/labels');

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);
app.use('/api/labels', labelsRoutes);

describe('inventory route authorization wiring', () => {
  test('protects item lookup by resource ID', async () => {
    const response = await request(app).get('/api/inventory/123');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      handler: 'getItemById',
      itemAccess: { source: 'params', key: 'id' },
      itemListAccess: false,
    });
  });

  test('protects alert acknowledgement by item ID', async () => {
    const response = await request(app).post(
      '/api/inventory/alerts/123/acknowledge',
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.handler).toBe('acknowledgeAlert');
    expect(response.body.itemAccess).toEqual({
      source: 'params',
      key: 'id',
    });
  });

  test('protects inventory adjustment by body item_id', async () => {
    const response = await request(app)
      .post('/api/inventory/adjust')
      .send({
        item_id: 123,
        location_id: 5,
        change_quantity: 10,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.handler).toBe('adjustInventory');
    expect(response.body.itemAccess).toEqual({
      source: 'body',
      key: 'item_id',
    });
  });

  test('protects selected-label printing with list ownership checks', async () => {
    const response = await request(app)
      .post('/api/labels/print/selected')
      .send({ item_ids: [1, 2] });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      handler: 'printSelected',
      itemAccess: null,
      itemListAccess: true,
    });
  });
});
