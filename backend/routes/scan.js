// backend/routes/scan.js
const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/scanController');
const authenticate = require('../middleware/authMiddleware');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(asyncHandler(authenticate));

router.post(
  '/',
  body('barcode').isString().notEmpty().withMessage('Barcode is required'),
  body('client_id').isInt().withMessage('client_id is required'),
  handleValidation,
  asyncHandler(ctrl.processScan),
);

module.exports = router;
