// In inventory-service/routes/locations.js (Corrected)
const express = require('express');
// CORRECTED: Added 'param' to the import below
const { body, param } = require('express-validator');
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

router.delete(
  '/:id',
  param('id').isInt().withMessage('A valid location ID is required'),
  handleValidation,
  ctrl.deleteLocation,
);

module.exports = router;
