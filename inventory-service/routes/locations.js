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

module.exports = router;
