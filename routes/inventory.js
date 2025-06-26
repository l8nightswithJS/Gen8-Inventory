const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

// Get all items (with optional search & pagination)
router.get('/', authenticate, controller.getAllItems);

// Export CSV for a client's items
router.get('/export', authenticate, controller.exportCSV);

// Item detail
router.get('/:id', authenticate, controller.getItemById);

// Create new item
router.post('/', authenticate, requireRole('admin'), controller.createItem);

// Bulk import
router.post('/bulk', authenticate, requireRole('admin'), controller.bulkImportItems);

// Update item
router.put('/:id', authenticate, requireRole('admin'), controller.updateItem);

// Delete item
router.delete('/:id', authenticate, requireRole('admin'), controller.deleteItem);

module.exports = router;
