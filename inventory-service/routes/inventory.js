const express = require('express');
const { body, param, query } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const warehouseImportController = require('../controllers/warehouseImportController');
const warehouseExportController = require('../controllers/warehouseExportController');
const inventoryReadController = require('../controllers/inventoryReadController');
const inventoryAdjustmentController = require('../controllers/inventoryAdjustmentController');
const warehouseOperationsController = require('../controllers/warehouseOperationsController');
const masterWarehouseController = require('../controllers/masterWarehouseController');
const itemLifecycleController = require('../controllers/itemLifecycleController');
const profileAlertsController = require('../controllers/profileAlertsController');
const containerWorkflowController = require('../controllers/containerWorkflowController');
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
  const text = String(value).trim();
  const plain = signed
    ? /^-?\d+(?:\.\d{1,3})?$/
    : /^\d+(?:\.\d{1,3})?$/;
  const formatted = signed
    ? /^-?\d{1,3}(?:,\d{3})+(?:\.\d{1,3})?$/
    : /^\d{1,3}(?:,\d{3})+(?:\.\d{1,3})?$/;
  return plain.test(text) || formatted.test(text);
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
  masterWarehouseController.getMasterInventoryByLocation,
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
  warehouseExportController.exportItems,
);

router.get(
  '/',
  query('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryReadController.listItems,
);

router.post(
  '/transfer',
  body('item_id').isInt({ min: 1 }).withMessage('item_id is required').toInt(),
  body('to_location_id')
    .isInt({ min: 1 })
    .withMessage('to_location_id is required')
    .toInt(),
  body('from_location_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('quantity')
    .optional({ nullable: true })
    .custom((value) => isSupportedDecimal(value))
    .withMessage('quantity must be positive with up to 3 decimals'),
  body('move_all').optional().isBoolean(),
  body('reason').optional().isString().isLength({ max: 500 }),
  handleValidation,
  requireItemAccess({ source: 'body', key: 'item_id' }),
  warehouseOperationsController.transferItem,
);

router.post(
  '/:id/remaining',
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  body('location_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('remaining_quantity')
    .custom((value) => isSupportedDecimal(value))
    .withMessage('remaining_quantity must be non-negative with up to 3 decimals'),
  body('reason').optional().isString().isLength({ max: 500 }),
  handleValidation,
  requireItemAccess(),
  warehouseOperationsController.setRemainingQuantity,
);

router.get(
  '/:id/movements',
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  warehouseOperationsController.getMovementHistory,
);

router.post(
  '/:id/quality',
  requireRole('admin', 'staff'),
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  body('quality_status')
    .isIn(['pending_inspection', 'released', 'hold', 'quarantine', 'rejected'])
    .withMessage('Invalid quality_status'),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  handleValidation,
  requireItemAccess(),
  containerWorkflowController.setQualityStatus,
);

router.post(
  '/:id/repack',
  requireRole('admin', 'staff'),
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  body('source_location_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('containers').isArray({ min: 1 }).withMessage('containers must be a non-empty array'),
  body('containers.*.quantity')
    .custom((value) => isSupportedDecimal(value) && Number(String(value).replace(/,/g, '')) > 0)
    .withMessage('each new container quantity must be greater than zero'),
  body('containers.*.package_type').optional({ nullable: true }).isString().isLength({ max: 120 }),
  handleValidation,
  requireItemAccess(),
  containerWorkflowController.repackContainer,
);

router.get(
  '/:id/trace',
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  containerWorkflowController.getTraceability,
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
  itemLifecycleController.getItemById,
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
  requireRole('admin'),
  param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt(),
  handleValidation,
  requireItemAccess(),
  itemLifecycleController.archiveItem,
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
  body('location_strategy')
    .optional()
    .isIn(['staging', 'file', 'selected'])
    .withMessage('location_strategy must be staging, file, or selected'),
  body('template').optional({ nullable: true }).isObject(),
  handleValidation,
];

router.post(
  '/bulk',
  requireRole('admin'),
  bulkValidators,
  warehouseImportController.bulkImportItems,
);

router.post(
  '/import',
  requireRole('admin'),
  bulkValidators,
  warehouseImportController.bulkImportItems,
);

module.exports = router;
