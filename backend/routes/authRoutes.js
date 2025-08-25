// backend/routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validationMiddleware');
const auth = require('../controllers/authController');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post(
  '/register',
  body('username').isString().notEmpty(),
  body('password').isString().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  asyncHandler(auth.register),
);

router.post(
  '/login',
  // FIX: This now validates for 'username' to match the frontend
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
  handleValidation,
  asyncHandler(auth.login),
);

router.post('/test-login', asyncHandler(auth.testLogin));

module.exports = router;
