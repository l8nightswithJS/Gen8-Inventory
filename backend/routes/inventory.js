const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/inventoryController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// all inventory routes need authentication
router.use(authenticate);

// GET /api/items?client_id=&page=&q=
router.get(
  '/',
  query('client_id').isInt().withMessage('client_id is required'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1 }).toInt(),
  query('q').optional().isString(),
  handleValidation,
  controller.getAllItems
);

// GET /api/items/:id
router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid item id'),
  handleValidation,
  controller.getItemById
);

// POST /api/items
router.post(
  '/',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required'),
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('part_number').isString().notEmpty().withMessage('Part Number is required'),
  body('description').optional().isString(),
  body('lot_number').optional().isString(),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer').toInt(),
  body('location').optional().isString(),
  body('has_lot').optional().isBoolean().toBoolean(),
  handleValidation,
  controller.createItem
);

// PUT /api/items/:id
router.put(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id'),
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('part_number').isString().notEmpty().withMessage('Part Number is required'),
  body('description').optional().isString(),
  body('lot_number').optional().isString(),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer').toInt(),
  body('location').optional().isString(),
  body('has_lot').optional().isBoolean().toBoolean(),
  handleValidation,
  controller.updateItem
);

// DELETE /api/items/:id
router.delete(
  '/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Invalid item id'),
  handleValidation,
  controller.deleteItem
);

// POST /api/items/bulk
router.post(
  '/bulk',
  requireRole('admin'),
  body('client_id').isInt().withMessage('client_id is required'),
  body('items').isArray({ min: 1 }).withMessage('items must be an array'),
  handleValidation,
  controller.bulkImportItems
);

module.exports = router;
