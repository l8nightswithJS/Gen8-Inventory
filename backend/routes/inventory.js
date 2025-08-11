// backend/routes/inventory.js
const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/inventoryController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// All inventory routes require authentication
router.use(authenticate);

// Alerts
router.get(
  '/alerts',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  controller.getActiveAlerts,
);

// List & CRUD
router.get(
  '/',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  controller.listItems,
);

router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  controller.getItemById,
);

router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('attributes').isObject().withMessage('attributes object is required'),
  handleValidation,
  controller.createItem,
);

router.put(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid id').toInt(),
  body('attributes').isObject().withMessage('attributes object is required'),
  handleValidation,
  controller.updateItem,
);

router.delete(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  controller.deleteItem,
);

// Bulk import (support both /bulk and legacy /import)
const bulkValidators = [
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  handleValidation,
];

router.post(
  '/bulk',
  requireRole('admin'),
  bulkValidators,
  controller.bulkImportItems,
);
router.post(
  '/import',
  requireRole('admin'),
  bulkValidators,
  controller.bulkImportItems,
);

module.exports = router;
