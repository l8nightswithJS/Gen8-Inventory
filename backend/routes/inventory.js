// routes/inventory.js
const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/inventoryController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// all inventory routes need authentication
router.use(authenticate);

//
// ─── ALERTS ────────────────────────────────────────────────────────────────────
//

// Compute active alerts from item attributes (quantity <= low_stock_threshold)
router.get(
  '/alerts',
  requireRole('admin'),
  query('client_id')
    .exists()
    .withMessage('client_id is required')
    .bail()
    .isInt()
    .withMessage('client_id must be an integer')
    .toInt(),
  handleValidation,
  controller.getActiveAlerts,
);

// (Optional) Acknowledge endpoint kept for compatibility; it’s a no‑op when alerts are computed
router.post(
  '/alerts/:alertId/acknowledge',
  requireRole('admin'),
  param('alertId').isInt().withMessage('Invalid alert id').toInt(),
  handleValidation,
  controller.acknowledgeAlert,
);

//
// ─── ITEM CRUD ────────────────────────────────────────────────────────────────
//

// List items for a client
router.get(
  '/',
  query('client_id')
    .exists()
    .withMessage('client_id is required')
    .bail()
    .isInt()
    .withMessage('client_id must be an integer')
    .toInt(),
  handleValidation,
  controller.getAllItems,
);

// Fetch one item
router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.getItemById,
);

// Create new item (admin)
router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('attributes').isObject().withMessage('attributes must be an object'),
  handleValidation,
  controller.createItem,
);

// Update item (admin)
// By default REPLACES attributes; pass ?merge=true to shallow‑merge into existing attributes
router.put(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id').toInt(),
  body('attributes').isObject().withMessage('attributes must be an object'),
  query('merge').optional().isBoolean().toBoolean(),
  body('merge').optional().isBoolean().toBoolean(),
  handleValidation,
  controller.updateItem,
);

// Delete item (admin)
router.delete(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.deleteItem,
);

// Bulk import (admin)
// Accepts: { client_id, items: Array<object> }
// Each array element can be either a raw attribute map, or { attributes: {...} }
router.post(
  '/bulk',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  handleValidation,
  controller.bulkImportItems,
);

module.exports = router;
