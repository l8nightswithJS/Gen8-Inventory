// backend/routes/barcodes.js
const express = require('express');
const { query, body, param } = require('express-validator');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');
const ctrl = require('../controllers/barcodesController');

const router = express.Router();

// All barcode routes require auth
router.use(authenticate);

// Lookup by barcode
router.get(
  '/lookup',
  query('code').isString().notEmpty(),
  query('client_id').optional().isInt().toInt(),
  handleValidation,
  ctrl.lookup,
);

// Assign barcode to item (admin only)
router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt().toInt(),
  body('item_id').isInt().toInt(),
  body('barcode').isString().notEmpty(),
  body('symbology').optional().isString(),
  handleValidation,
  ctrl.assign,
);

// List barcodes for an item
router.get(
  '/items/:id',
  param('id').isInt().toInt(),
  handleValidation,
  ctrl.listForItem,
);

// Delete a mapping (admin only)
router.delete(
  '/:id',
  requireRole('admin'),
  param('id').isInt().toInt(),
  handleValidation,
  ctrl.remove,
);

module.exports = router;
