// inventory-service/routes/inventory.js
const express = require('express');
const { body, param, query } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const { requireRole, handleValidation } = require('shared-auth');
const { requireItemAccess } = require('../middleware/requireItemAccess');

const router = express.Router();

router.get(
  '/by-location',
  requireRole('admin'),
  inventoryController.getMasterInventoryByLocation,
);

// ---------- Alerts ----------
router.get(
  '/alerts',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryController.getActiveAlerts,
);

router.post(
  '/alerts/:id/acknowledge',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  inventoryController.acknowledgeAlert,
);

// ---------- Items list / CRUD ----------
router.get(
  '/',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryController.listItems,
);

router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  inventoryController.getItemById,
);

router.post(
  '/',
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('attributes').isObject().withMessage('attributes object is required'),
  handleValidation,
  inventoryController.createItem,
);

router.put(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  body('attributes').isObject().withMessage('attributes object is required'),
  handleValidation,
  requireItemAccess(),
  inventoryController.updateItem,
);

router.delete(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  inventoryController.deleteItem,
);

router.post(
  '/adjust',
  body('item_id').isInt().withMessage('item_id is required').toInt(),
  body('location_id').isInt().withMessage('location_id is required').toInt(),
  body('change_quantity')
    .isInt()
    .withMessage('change_quantity must be an integer')
    .toInt(),
  handleValidation,
  requireItemAccess({ source: 'body', key: 'item_id' }),
  inventoryController.adjustInventory,
);

// ---------- Bulk import ----------
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
  inventoryController.bulkImportItems,
);

router.post(
  '/import',
  requireRole('admin'),
  bulkValidators,
  inventoryController.bulkImportItems,
);

// ---------- Export (CSV) ----------
router.get(
  '/export',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryController.exportItems,
);

module.exports = router;
