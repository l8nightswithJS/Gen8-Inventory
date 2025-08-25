const express = require('express');
const { body, param, query } = require('express-validator');

const controller = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/authMiddleware'); // CORRECTED LINE
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// everything under /api/items requires auth
router.use(authenticate);

// ---------- Alerts ----------
router.get(
  '/alerts',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  controller.getActiveAlerts,
);

// acknowledge a single alert (by item id)
router.post(
  '/alerts/:id/acknowledge',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  controller.acknowledgeAlert,
);

// ---------- Items list / CRUD ----------
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

// Allow any authenticated user to create (RLS checks ownership of client_id)
router.post(
  '/',
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('attributes').isObject().withMessage('attributes object is required'),
  handleValidation,
  controller.createItem,
);

// Allow any authenticated user to update (RLS checks ownership)
router.put(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  body('attributes').isObject().withMessage('attributes object is required'),
  handleValidation,
  controller.updateItem,
);

// Allow any authenticated user to delete (RLS checks ownership)
router.delete(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  controller.deleteItem,
);

// ---------- Bulk import (remains admin-only) ----------
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

// ---------- Export (CSV) ----------
router.get(
  '/export',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  controller.exportItems,
);

module.exports = router;
