// backend/routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validationMiddleware');
const auth = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  body('username').isString().notEmpty(),
  body('password').isString().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  auth.register,
);

router.post(
  '/login',
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
  handleValidation,
  auth.login,
);

module.exports = router;
