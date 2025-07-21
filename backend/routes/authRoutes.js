// routes/authRoutes.js
const express               = require('express');
const { body }              = require('express-validator');
const { handleValidation }  = require('../middleware/validationMiddleware');
const authController        = require('../controllers/authController');

const router = express.Router();

// Registration: creates a pending user
router.post(
  '/register',
  body('username')
    .isString().notEmpty().withMessage('Username is required'),
  body('password')
    .isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['admin','staff']).withMessage('Role must be either "admin" or "staff"'),
  handleValidation,
  authController.register
);

// Login: only approved users may authenticate
router.post(
  '/login',
  body('username')
    .isString().notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidation,
  authController.login
);

module.exports = router;
