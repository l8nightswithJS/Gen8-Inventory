const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// all /api/users endpoints require authentication + admin
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', controller.getAllUsers);

router.get(
  '/:id',
  param('id').isInt().withMessage('must be an integer'),
  handleValidation,
  controller.getUserById
);

router.post(
  '/',
  body('username').isString().notEmpty().withMessage('required'),
  body('password').isLength({ min: 6 }).withMessage('minimum 6 characters'),
  body('role').isIn(['admin', 'staff']).withMessage('must be admin or staff'),
  handleValidation,
  controller.createUser
);

router.put(
  '/:id',
  param('id').isInt().withMessage('must be an integer'),
  body('username').optional().isString().notEmpty(),
  body('password').optional().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  controller.updateUser
);

router.delete(
  '/:id',
  param('id').isInt().withMessage('must be an integer'),
  handleValidation,
  controller.deleteUser
);

module.exports = router;
