// routes/inventory.js
const express                 = require('express')
const { body, param, query } = require('express-validator')
const controller              = require('../controllers/inventoryController')
const authenticate            = require('../middleware/authMiddleware')
const requireRole             = require('../middleware/requireRole')
const { handleValidation }    = require('../middleware/validationMiddleware')

const router = express.Router()

// all inventory routes need authentication
router.use(authenticate)

//
// ─── ALERTS ────────────────────────────────────────────────────────────────────
//

// Fetch all active alerts for a client
//    GET /api/items/alerts?client_id=123
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

// Acknowledge (clear) one alert by alert ID
//    POST /api/items/alerts/:alertId/acknowledge
router.post(
  '/alerts/:alertId/acknowledge',
  requireRole('admin'),
  param('alertId')
    .isInt().withMessage('Invalid alert id')
    .toInt(),
  handleValidation,
  controller.acknowledgeAlert
)

//
// ─── ITEM CRUD ────────────────────────────────────────────────────────────────
//

// List items for a client
//    GET /api/items?client_id=123
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

// Fetch one item by its ID
//    GET /api/items/:id
router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.getItemById
)

// Create a new item (admin only)
//    POST /api/items
router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('name').isString().notEmpty(),
  body('part_number').isString().notEmpty(),
  body('quantity').isInt({ min: 0 }).withMessage('quantity must be ≥ 0').toInt(),
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

// Update an existing item (admin only)
//    PUT /api/items/:id
router.put(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id').toInt(),
  body('name').isString().notEmpty(),
  body('part_number').isString().notEmpty(),
  body('quantity').isInt({ min: 0 }).withMessage('quantity must be ≥ 0').toInt(),
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

// Delete an item (admin only)
//    DELETE /api/items/:id
router.delete(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.deleteItem
)

module.exports = router
