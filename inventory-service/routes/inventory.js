const express = require('express');
const { body, param, query } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const bulkImportController = require('../controllers/bulkImportController');
const inventoryReadController = require('../controllers/inventoryReadController');
const inventoryAdjustmentController = require('../controllers/inventoryAdjustmentController');
const profileAlertsController = require('../controllers/profileAlertsController');
const { requireRole, handleValidation } = require('shared-auth');
const { requireItemAccess } = require('../middleware/requireItemAccess');
const {
  validateProfileAttributes,
} = require('../middleware/validateProfileAttributes');

const router = express.Router();

const optionalText = (field) =>
  body(field)
    .optional({ nullable: true })
    .isString()
    .withMessage(`${field} must be a string`);

const isSupportedDecimal = (value, { signed = false } = {}) => {
  if (value === '' || value === null || value === undefined) return true;
  const expression = signed
    ? /^-?\d+(?:\.\d{1,3})?$/
    : /^\d+(?:\.\d{1,3})?$/;
  return expression.test(String(value).trim());
};

const optionalNonNegativeDecimal = (field) =>
  body(field)
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => isSupportedDecimal(value))
    .withMessage(`${field} must be a non-negative number with up to 3 decimals`);

const commonItemValidators = [
  optionalText('lot_number'),
  optionalText('name'),
  optionalText('description'),
  optionalText('barcode'),
  optionalText('vendor_barcode'),
  optionalText('uom'),
  optionalNonNegativeDecimal('reorder_level'),
  optionalNonNegativeDecimal('low_stock_threshold'),
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
  profileAlertsController.getActiveAlerts,
);

router.post(
  '/alerts/:id/acknowledge',
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  inventoryController.acknowledgeAlert,
);

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

router.post(
  '/:id/review/resolve',
  requireRole('admin'),
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  body('uom')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 40 })
    .withMessage('uom must be 40 characters or fewer'),
  body('allocations')
    .isArray({ min: 1 })
    .withMessage('allocations must be a non-empty array'),
  body('allocations.*.location_id')
    .isInt({ min: 1 })
    .withMessage('each allocation requires a valid location_id')
    .toInt(),
  body('allocations.*.quantity')
    .custom((value) => isSupportedDecimal(value))
    .withMessage('each allocation quantity must be non-negative with up to 3 decimals'),
  handleValidation,
  requireItemAccess(),
  inventoryAdjustmentController.resolveReview,
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
  validateProfileAttributes,
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
  validateProfileAttributes,
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
    .custom((value) => isSupportedDecimal(value, { signed: true }))
    .withMessage('change_quantity must be a number with up to 3 decimals'),
  handleValidation,
  requireItemAccess({ source: 'body', key: 'item_id' }),
  inventoryAdjustmentController.adjustInventory,
);

const bulkValidators = [
  body('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  body('column_mapping').optional().isObject(),
  body('default_location_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .toInt(),
  body('template').optional().isObject(),
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
