const express = require('express');
const { body, param, query } = require('express-validator');

// Import all controller functions under the name 'inventoryController'
const inventoryController = require('../controllers/inventoryController');
// Import the single exported function from authMiddleware
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// This line will now work correctly because 'authenticate' is the function itself.
router.use(authenticate);

// ---------- Alerts ----------
router.get(
  '/alerts',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryController.getActiveAlerts, // Use the correct reference
);

// acknowledge a single alert (by item id)
router.post(
  '/alerts/:id/acknowledge',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  inventoryController.acknowledgeAlert, // Use the correct reference
);

// ---------- Items list / CRUD ----------
router.get(
  '/',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryController.listItems, // Use the correct reference
);

router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  inventoryController.getItemById, // Use the correct reference
);

// Allow any authenticated user to create (RLS checks ownership of client_id)
router.post(
  '/',
  body('client_id').isInt().withMessage('client_id is required').toInt(),
  body('attributes').isObject().withMessage('attributes object is required'),
  handleValidation,
  inventoryController.createItem, // Use the correct reference
);

// Allow any authenticated user to update (RLS checks ownership)
router.put(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  body('attributes').isObject().withMessage('attributes object is required'),
  handleValidation,
  inventoryController.updateItem, // Use the correct reference
);

// Allow any authenticated user to delete (RLS checks ownership)
router.delete(
  '/:id',
  param('id').isInt().withMessage('Invalid id').toInt(),
  handleValidation,
  inventoryController.deleteItem, // Use the correct reference
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
  inventoryController.bulkImportItems, // Use the correct reference
);
router.post(
  '/import',
  requireRole('admin'),
  bulkValidators,
  inventoryController.bulkImportItems, // Use the correct reference
);

// ---------- Export (CSV) ----------
router.get(
  '/export',
  query('client_id').isInt().withMessage('client_id is required').toInt(),
  handleValidation,
  inventoryController.exportItems, // Use the correct reference
);

module.exports = router;
