const express = require('express');
const { query, body, param } = require('express-validator');
const {
  handleValidation,
  requireClientPermission,
  requireRole,
} = require('shared-auth');
const ctrl = require('../controllers/barcodesController');

const router = express.Router();

router.get(
  '/lookup',
  query('code').isString().trim().notEmpty().isLength({ max: 255 }),
  query('client_id').isInt({ min: 1 }).toInt(),
  handleValidation,
  ...requireClientPermission('read'),
  ctrl.lookup,
);

router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt({ min: 1 }).toInt(),
  body('item_id').isInt({ min: 1 }).toInt(),
  body('barcode').isString().trim().notEmpty().isLength({ max: 255 }),
  body('symbology').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  handleValidation,
  ctrl.assign,
);

router.get(
  '/items/:id',
  param('id').isInt({ min: 1 }).toInt(),
  query('client_id').isInt({ min: 1 }).toInt(),
  handleValidation,
  ...requireClientPermission('read'),
  ctrl.listForItem,
);

router.delete(
  '/:id',
  requireRole('admin'),
  param('id').isInt({ min: 1 }).toInt(),
  handleValidation,
  ctrl.remove,
);

module.exports = router;
