const express = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/locationsController');
const labelsController = require('../controllers/labelsController');
const { handleValidation, requireRole } = require('shared-auth');

const router = express.Router();

const locationValidators = [
  body('code')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('Location code is required and must be 80 characters or fewer'),
  body('description').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('barcode').optional({ nullable: true }).isString().isLength({ max: 120 }),
  body('location_type')
    .optional()
    .isIn(['staging', 'rack', 'shelf', 'bin', 'floor', 'other'])
    .withMessage('Invalid location type'),
  body('zone').optional({ nullable: true }).isString().isLength({ max: 40 }),
  body('rack').optional({ nullable: true }).isString().isLength({ max: 40 }),
  body('shelf').optional({ nullable: true }).isString().isLength({ max: 40 }),
  body('bin_position').optional({ nullable: true }).isString().isLength({ max: 40 }),
  body('active').optional().isBoolean(),
];

router.get('/', ctrl.getLocations);

router.post(
  '/',
  requireRole('admin'),
  ...locationValidators,
  handleValidation,
  ctrl.createLocation,
);

router.post(
  '/:id/print-label',
  requireRole('admin', 'staff'),
  param('id').isInt({ min: 1 }).withMessage('A valid location ID is required').toInt(),
  handleValidation,
  labelsController.printLocation,
);

router.put(
  '/:id',
  requireRole('admin'),
  param('id').isInt({ min: 1 }).withMessage('A valid location ID is required'),
  ...locationValidators,
  handleValidation,
  ctrl.updateLocation,
);

router.delete(
  '/:id',
  requireRole('admin'),
  param('id').isInt({ min: 1 }).withMessage('A valid location ID is required'),
  handleValidation,
  ctrl.deleteLocation,
);

module.exports = router;
