const express          = require('express')
const { body, param, query } = require('express-validator')
const controller       = require('../controllers/inventoryController')
const authenticate     = require('../middleware/authMiddleware')
const requireRole      = require('../middleware/requireRole')
const { handleValidation }   = require('../middleware/validationMiddleware')

const router = express.Router()

// all inventory routes need authentication
router.use(authenticate)

/** ─── ALERTS ───────────────────────── */

// Fetch all active alerts for a client
router.get(
  '/alerts',
  requireRole('admin'),
  query('client_id')
    .exists().withMessage('client_id is required')
    .bail()
    .isInt().withMessage('client_id must be an integer')
    .toInt(),
  handleValidation,
  controller.getActiveAlerts
)

// Acknowledge (clear) one alert by item ID
router.post(
  '/alerts/:itemId/acknowledge',
  requireRole('admin'),
  param('itemId')
    .isInt().withMessage('Invalid item id')
    .toInt(),
  handleValidation,
  controller.acknowledgeAlert
)

/** ─── ITEMS CRUD ─────────────────────── */

// List items for a client
router.get(
  '/',
  query('client_id')
    .exists().withMessage('client_id is required')
    .bail()
    .isInt().withMessage('client_id must be an integer')
    .toInt(),
  handleValidation,
  controller.getAllItems
)

// Get one item by ID
router.get(
  '/:id(\\d+)',           // only match numeric IDs
  param('id').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.getItemById
)

// Create (admin only)
router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('name').isString().notEmpty(),
  body('part_number').isString().notEmpty(),
  body('quantity').isInt({ min: 0 }).toInt(),
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Threshold must be ≥ 0')
    .toInt(),
  body('alert_enabled')
    .optional()
    .isBoolean().withMessage('alert_enabled must be boolean')
    .toBoolean(),
  handleValidation,
  controller.createItem
)

// Update (admin only)
router.put(
  '/:id(\\d+)',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id').toInt(),
  body('name').isString().notEmpty(),
  body('part_number').isString().notEmpty(),
  body('quantity').isInt({ min: 0 }).toInt(),
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Threshold must be ≥ 0')
    .toInt(),
  body('alert_enabled')
    .optional()
    .isBoolean().withMessage('alert_enabled must be boolean')
    .toBoolean(),
  handleValidation,
  controller.updateItem
)

module.exports = router
