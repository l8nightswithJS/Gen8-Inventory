const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validationMiddleware');
const auth = require('../controllers/authController');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post(
  '/register',
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').isString().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  asyncHandler(auth.register),
);

router.post(
  '/login',
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').isString().notEmpty(),
  handleValidation,
  asyncHandler(auth.login),
);

router.post('/verify', auth.verifyToken);

module.exports = router;
