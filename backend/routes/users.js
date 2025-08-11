// backend/routes/users.js
const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', controller.getAllUsers);

router.post(
  '/',
  body('username').isString().notEmpty(),
  body('password').isString().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  controller.createUser,
);

router.put(
  '/:id',
  param('id').isInt().toInt(),
  body('username').optional().isString().notEmpty(),
  body('password').optional().isString().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'staff']),
  body('approved').optional().isBoolean(),
  handleValidation,
  controller.updateUser,
);

router.delete(
  '/:id',
  param('id').isInt().toInt(),
  handleValidation,
  controller.deleteUser,
);

module.exports = router;
