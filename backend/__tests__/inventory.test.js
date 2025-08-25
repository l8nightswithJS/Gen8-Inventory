const request = require('supertest');
const express = require('express');
const inventoryRoutes = require('../routes/inventory');
const authMiddleware = require('../middleware/authMiddleware');

// Mock the auth middleware to bypass actual authentication for tests
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin' }; // Mock a user object
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

describe('Inventory API', () => {
  it('GET /api/inventory - should return all inventory items', async () => {
    const response = await request(app).get('/api/inventory');

    // We expect a successful response
    expect(response.statusCode).toBe(200);

    // We expect the response body to be an array
    expect(Array.isArray(response.body)).toBe(true);
  });

  // You can add more tests here for other inventory endpoints (POST, PUT, DELETE)
});
