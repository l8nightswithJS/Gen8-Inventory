// routes/authRoutes.js
const express        = require('express');
const { body }       = require('express-validator');
const { handleValidation } = require('../middleware/validationMiddleware');
const authController = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  body('username').isString().notEmpty(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin','staff']),
  handleValidation,
  authController.register
);

router.post(
  '/login',
  body('username').isString().notEmpty(),
  body('password').notEmpty(),
  handleValidation,
  authController.login
);

module.exports = router;
