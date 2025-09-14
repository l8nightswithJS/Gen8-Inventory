// In inventory-service/routes/locations.js (Updated)
const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/locationsController');
const { handleValidation } = require('shared-auth');

const router = express.Router();

router.get('/', ctrl.getLocations);

router.post(
  '/',
  body('code').isString().notEmpty().withMessage('Location code is required'),
  body('description').optional().isString(),
  handleValidation,
  ctrl.createLocation,
);

// ADD THIS NEW ROUTE
router.delete(
  '/:id',
  param('id').isInt().withMessage('A valid location ID is required'),
  handleValidation,
  ctrl.deleteLocation,
);

module.exports = router;
