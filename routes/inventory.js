const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

// NEW: Pass client_id in query for GET, or body for POST/BULK
router.get('/', authenticate, controller.getAllItems);
router.get('/:id', authenticate, controller.getItemById);
router.post('/', authenticate, requireRole('admin'), controller.createItem);
router.post('/bulk', authenticate, requireRole('admin'), controller.bulkImportItems); // (we'll add this in step C)
router.put('/:id', authenticate, requireRole('admin'), controller.updateItem);
router.delete('/:id', authenticate, requireRole('admin'), controller.deleteItem);

module.exports = router;