// backend/routes/users.js
const express = require('express');
const { param, body } = require('express-validator');
const ctrl = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// All /api/users routes require admin authentication
router.use(authenticate);
router.use(requireRole('admin'));

// GET /api/users -> list all approved users
router.get('/', ctrl.getAllUsers);

// GET /api/users/pending -> list pending sign-ups
router.get('/pending', ctrl.getPendingUsers);

// GET /api/users/:id -> get a single user
router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid user ID'),
  handleValidation,
  ctrl.getUserById,
);

// POST /api/users/:id/approve -> approve a pending sign-up
router.post(
  '/:id/approve',
  param('id').isInt().withMessage('Invalid user ID'),
  handleValidation,
  ctrl.approveUser,
);

// PUT /api/users/:id -> update username/role only
router.put(
  '/:id',
  param('id').isInt().withMessage('Invalid user ID'),
  body('username').optional().isString().notEmpty(),
  body('role').optional().isIn(['admin', 'staff']),
  handleValidation,
  ctrl.updateUser,
);

// DELETE /api/users/:id -> delete a user
router.delete(
  '/:id',
  param('id').isInt().withMessage('Invalid user ID'),
  handleValidation,
  ctrl.deleteUser,
);

module.exports = router;
