// backend/routes/locations.js
const express = require('express');
const { query, body } = require('express-validator');
const ctrl = require('../controllers/locationsController');
const authenticate = require('../middleware/authMiddleware');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(asyncHandler(authenticate));

router.get(
  '/',
  query('client_id').isInt().withMessage('client_id is required'),
  handleValidation,
  asyncHandler(ctrl.getLocations),
);

router.post(
  '/',
  body('client_id').isInt().withMessage('client_id is required'),
  body('code').isString().notEmpty().withMessage('Location code is required'),
  body('description').optional().isString(),
  handleValidation,
  asyncHandler(ctrl.createLocation),
);

module.exports = router;
