// backend/routes/users.js
const express = require('express');
const { param, body } = require('express-validator');
const ctrl = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// A simple wrapper to catch errors in async routes
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// FIX: Apply the asyncHandler to the async middleware to prevent crashes
router.use(asyncHandler(authenticate));
router.use(asyncHandler(requireRole('admin')));

// --- Routes ---
router.get('/', asyncHandler(ctrl.getAllUsers));
router.get('/pending', asyncHandler(ctrl.getPendingUsers));
router.get(
  '/:id',
  param('id').isString().withMessage('Invalid user ID'),
  handleValidation,
  asyncHandler(ctrl.getUserById),
);
router.post(
  '/:id/approve',
  param('id').isString().withMessage('Invalid user ID'),
  handleValidation,
  asyncHandler(ctrl.approveUser),
);
router.put(
  '/:id',
  param('id').isString().withMessage('Invalid user ID'),
  body('username').optional().isString().notEmpty(),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  asyncHandler(ctrl.updateUser),
);
router.delete(
  '/:id',
  param('id').isString().withMessage('Invalid user ID'),
  handleValidation,
  asyncHandler(ctrl.deleteUser),
);

module.exports = router;
