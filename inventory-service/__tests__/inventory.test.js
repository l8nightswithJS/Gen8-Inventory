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

jest.mock('../middleware/validateProfileAttributes', () => ({
  validateProfileAttributes: (_req, _res, next) => next(),
}));

const mockMakeHandler = (name) => (req, res) =>
  res.json({
    handler: name,
    itemAccess: req.itemAccess || null,
    itemListAccess: req.itemListAccess || false,
  });

jest.mock('../controllers/inventoryController', () => ({
  getMasterInventoryByLocation: mockMakeHandler('getMasterInventoryByLocation'),
  acknowledgeAlert: mockMakeHandler('acknowledgeAlert'),
  getItemById: mockMakeHandler('getItemById'),
  createItem: mockMakeHandler('createItem'),
  updateItem: mockMakeHandler('updateItem'),
  deleteItem: mockMakeHandler('deleteItem'),
  exportItems: mockMakeHandler('exportItems'),
}));

jest.mock('../controllers/profileAlertsController', () => ({
  getActiveAlerts: mockMakeHandler('getActiveAlerts'),
}));

jest.mock('../controllers/inventoryReadController', () => ({
  listItems: mockMakeHandler('listItems'),
}));

jest.mock('../controllers/bulkImportController', () => ({
  bulkImportItems: mockMakeHandler('bulkImportItems'),
}));

jest.mock('../controllers/inventoryAdjustmentController', () => ({
  adjustInventory: mockMakeHandler('adjustInventory'),
  resolveReview: mockMakeHandler('resolveReview'),
}));

jest.mock('../controllers/labelsController', () => ({
  printAllForClient: mockMakeHandler('printAllForClient'),
  printSelected: mockMakeHandler('printSelected'),
}));

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

  test('uses profile-aware alert controller', async () => {
    const response = await request(app).get(
      '/api/inventory/alerts?client_id=1',
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.handler).toBe('getActiveAlerts');
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

  test('protects decimal inventory adjustment by body item_id', async () => {
    const response = await request(app)
      .post('/api/inventory/adjust')
      .send({
        item_id: 123,
        location_id: 5,
        change_quantity: -2.5,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.handler).toBe('adjustInventory');
    expect(response.body.itemAccess).toEqual({
      source: 'body',
      key: 'item_id',
    });
  });

  test('protects review resolution by item ID', async () => {
    const response = await request(app)
      .post('/api/inventory/123/review/resolve')
      .send({
        uom: 'lb',
        allocations: [{ location_id: 5, quantity: 12.5 }],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.handler).toBe('resolveReview');
    expect(response.body.itemAccess).toEqual({
      source: 'params',
      key: 'id',
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
