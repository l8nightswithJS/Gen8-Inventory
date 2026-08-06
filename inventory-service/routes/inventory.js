const express = require('express');
const { body, param, query } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const bulkImportController = require('../controllers/bulkImportController');
const inventoryReadController = require('../controllers/inventoryReadController');
const { requireRole, handleValidation } = require('shared-auth');
const { requireItemAccess } = require('../middleware/requireItemAccess');

const router = express.Router();

const optionalText = (field) =>
  body(field)
    .optional({ nullable: true })
    .isString()
    .withMessage(`${field} must be a string`);

const optionalNonNegativeInteger = (field) =>
  body(field)
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => value === '' || Number.isInteger(Number(value)))
    .withMessage(`${field} must be an integer`)
    .custom((value) => value === '' || Number(value) >= 0)
    .withMessage(`${field} must be non-negative`);

const commonItemValidators = [
  optionalText('lot_number'),
  optionalText('name'),
  optionalText('description'),
  optionalText('barcode'),
  optionalNonNegativeInteger('reorder_level'),
  optionalNonNegativeInteger('low_stock_threshold'),
  body('alert_enabled')
    .optional()
    .isBoolean()
    .withMessage('alert_enabled must be a boolean'),
  body('attributes')
    .optional({ nullable: true })
    .isObject()
    .withMessage('attributes must be an object'),
];

router.get(
  '/by-location',
  requireRole('admin'),
  inventoryController.getMasterInventoryByLocation,
);

router.get(
  '/alerts',
  query('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryController.getActiveAlerts,
);

router.post(
  '/alerts/:id/acknowledge',
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  inventoryController.acknowledgeAlert,
);

// Named GET routes must be declared before GET /:id.
router.get(
  '/export',
  query('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryController.exportItems,
);

router.get(
  '/',
  query('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryReadController.listItems,
);

router.get(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  inventoryController.getItemById,
);

router.post(
  '/',
  body('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  body('part_number')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('part_number is required'),
  ...commonItemValidators,
  handleValidation,
  inventoryController.createItem,
);

router.put(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  body('part_number')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('part_number cannot be empty'),
  ...commonItemValidators,
  handleValidation,
  requireItemAccess(),
  inventoryController.updateItem,
);

router.delete(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  inventoryController.deleteItem,
);

router.post(
  '/adjust',
  body('item_id').isInt({ min: 1 }).withMessage('item_id is required').toInt(),
  body('location_id')
    .isInt({ min: 1 })
    .withMessage('location_id is required')
    .toInt(),
  body('change_quantity')
    .isFloat()
    .withMessage('change_quantity must be a number')
    .toFloat(),
  handleValidation,
  requireItemAccess({ source: 'body', key: 'item_id' }),
  inventoryController.adjustInventory,
);

const bulkValidators = [
  body('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  handleValidation,
];

router.post(
  '/bulk',
  requireRole('admin'),
  bulkValidators,
  bulkImportController.bulkImportItems,
);

router.post(
  '/import',
  requireRole('admin'),
  bulkValidators,
  bulkImportController.bulkImportItems,
);

module.exports = router;
