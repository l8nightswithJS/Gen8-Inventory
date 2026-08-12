const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/scanController');
const { handleValidation } = require('shared-auth');

const router = express.Router();

router.post(
  '/',
  body('barcode').isString().trim().notEmpty().isLength({ max: 255 }).withMessage('Barcode is required'),
  body('client_id').isInt({ min: 1 }).toInt().withMessage('client_id is required'),
  handleValidation,
  ctrl.processScan,
);

module.exports = router;
