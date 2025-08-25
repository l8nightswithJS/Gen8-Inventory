// backend/routes/users.js
const express = require('express');
const { param, body } = require('express-validator');
const ctrl = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Apply middleware
router.use(asyncHandler(authenticate));
router.use(requireRole('admin')); // No asyncHandler needed here due to refactor

// Define routes
router.get('/', asyncHandler(ctrl.getAllUsers));
router.get('/pending', asyncHandler(ctrl.getPendingUsers));
router.get(
  '/:id',
  param('id').isString().notEmpty(),
  handleValidation,
  asyncHandler(ctrl.getUserById),
);
router.post(
  '/:id/approve',
  param('id').isString().notEmpty(),
  handleValidation,
  asyncHandler(ctrl.approveUser),
);
router.put(
  '/:id',
  param('id').isString().notEmpty(),
  body('username').optional().isString().notEmpty(),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  asyncHandler(ctrl.updateUser),
);
router.delete(
  '/:id',
  param('id').isString().notEmpty(),
  handleValidation,
  asyncHandler(ctrl.deleteUser),
);

module.exports = router;
