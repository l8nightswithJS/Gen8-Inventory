// routes/inventory.js
const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/inventoryController');
const authenticate = require('../middleware/authMiddleware');
const requireRole  = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// all inventory routes need authentication
router.use(authenticate);

// existing item routes…
router.get(
  '/',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  /* …other validators… */
  handleValidation,
  controller.getAllItems
);

router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.getItemById
);

router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('name').isString().notEmpty(),
  body('part_number').isString().notEmpty(),
  body('quantity').isInt({ min: 0 }).toInt(),
  /* …existing validators… */
  // ← new validators:
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Threshold must be ≥ 0')
    .toInt(),
  body('alert_enabled')
    .optional()
    .isBoolean()
    .withMessage('alert_enabled must be boolean')
    .toBoolean(),
  handleValidation,
  controller.createItem
);

router.put(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id').toInt(),
  body('name').isString().notEmpty(),
  body('part_number').isString().notEmpty(),
  body('quantity').isInt({ min: 0 }).toInt(),
  /* …existing validators… */
  // ← new validators:
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Threshold must be ≥ 0')
    .toInt(),
  body('alert_enabled')
    .optional()
    .isBoolean()
    .withMessage('alert_enabled must be boolean')
    .toBoolean(),
  handleValidation,
  controller.updateItem
);

// DELETE, bulk, etc…

// NEW: fetch active alerts for a client
router.get(
  '/alerts',
  requireRole('admin'),
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  controller.getActiveAlerts
);

// NEW: acknowledge (clear) an alert
router.post(
  '/alerts/:itemId/acknowledge',
  requireRole('admin'),
  param('itemId').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.acknowledgeAlert
);

module.exports = router;
