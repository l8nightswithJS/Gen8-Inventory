// inventory-service/__tests__/inventory.test.js
const request = require('supertest');
const express = require('express');
const inventoryRoutes = require('../routes/inventory');

// THIS IS THE CORRECTED MOCK
// It now returns a function directly, perfectly mimicking the real authMiddleware.js file.
jest.mock('../middleware/authMiddleware', () =>
  jest.fn((req, res, next) => {
    // Simulate a logged-in user for the test environment
    req.user = { id: 'mock-user-id-123', role: 'admin' };
    next();
  }),
);

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

describe('Inventory API Endpoints', () => {
  it('GET /api/inventory - should succeed and return an array of inventory items', async () => {
    // This test requires a client_id query parameter to pass validation
    const response = await request(app).get('/api/inventory?client_id=1');

    // Check for a successful HTTP status code
    expect(response.statusCode).toBe(200);

    // Verify that the response body is an array
    expect(Array.isArray(response.body)).toBe(true);
  });
});
