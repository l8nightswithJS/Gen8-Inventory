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

// FIX: Apply the asyncHandler to the async middleware
router.use(asyncHandler(authenticate));
router.use(asyncHandler(requireRole('admin')));

// GET /api/users -> list all approved users
router.get('/', asyncHandler(ctrl.getAllUsers));

// GET /api/users/pending -> list pending sign-ups
router.get('/pending', asyncHandler(ctrl.getPendingUsers));

// GET /api/users/:id -> get a single user
router.get(
  '/:id',
  param('id').isString().withMessage('Invalid user ID'),
  handleValidation,
  asyncHandler(ctrl.getUserById),
);

// POST /api/users/:id/approve -> approve a pending sign-up
router.post(
  '/:id/approve',
  param('id').isString().withMessage('Invalid user ID'),
  handleValidation,
  asyncHandler(ctrl.approveUser),
);

// PUT /api/users/:id -> update username/role only
router.put(
  '/:id',
  param('id').isString().withMessage('Invalid user ID'),
  body('username').optional().isString().notEmpty(),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  asyncHandler(ctrl.updateUser),
);

// DELETE /api/users/:id -> delete a user
router.delete(
  '/:id',
  param('id').isString().withMessage('Invalid user ID'),
  handleValidation,
  asyncHandler(ctrl.deleteUser),
);

module.exports = router;
