// routes/inventory.js
const express      = require('express')
const { body, param, query } = require('express-validator')
const controller   = require('../controllers/inventoryController')
const authenticate = require('../middleware/authMiddleware')
const requireRole  = require('../middleware/requireRole')
const { handleValidation } = require('../middleware/validationMiddleware')

const router = express.Router()

// all inventory routes need authentication
router.use(authenticate)

// ─── 1) ALERTS ROUTES ────────────────────────────────────────────────────────────

// Fetch active low‑stock alerts (optionally for one client)
router.get(
  '/alerts',
  requireRole('admin'),
  query('client_id')
    .optional()
    .isInt().withMessage('client_id must be an integer')
    .toInt(),
  handleValidation,
  controller.getActiveAlerts
)

// Acknowledge (clear) a single alert by item ID
router.post(
  '/alerts/:itemId/acknowledge',
  requireRole('admin'),
  param('itemId').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.acknowledgeAlert
)


// ─── 2) ITEM CRUD ROUTES ─────────────────────────────────────────────────────────

// List all items for a client
router.get(
  '/',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  controller.getAllItems
)

// Fetch one item by its ID
router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid item id').toInt(),
  handleValidation,
  controller.getItemById
)

// Create a new item (admin only)
router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('name').isString().notEmpty(),
  body('part_number').isString().notEmpty(),
  body('quantity').isInt({ min: 0 }).toInt(),
  // new low‑stock fields:
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Threshold must be ≥ 0')
    .toInt(),
  body('alert_enabled')
    .optional()
    .isBoolean().withMessage('alert_enabled must be boolean')
    .toBoolean(),
  handleValidation,
  controller.createItem
)

// Update an existing item (admin only)
router.put(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id').toInt(),
  body('name').isString().notEmpty(),
  body('part_number').isString().notEmpty(),
  body('quantity').isInt({ min: 0 }).toInt(),
  // new low‑stock fields:
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Threshold must be ≥ 0')
    .toInt(),
  body('alert_enabled')
    .optional()
    .isBoolean().withMessage('alert_enabled must be boolean')
    .toBoolean(),
  handleValidation,
  controller.updateItem
)

// (Other DELETE, bulk, etc. can go here…)

module.exports = router
