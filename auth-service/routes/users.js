// auth-service/routes/users.js
const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { requireRole, handleValidation } = require('shared-auth');

const router = express.Router();

// ✅ Place ALL general middleware at the top.
// This ensures they run for every request handled by this router.
router.use((req, res, next) => {
  console.log(`[USERS-ROUTER] ${req.method} ${req.originalUrl}`);
  next();
});

// Protect all subsequent routes in this file, allowing only admins
router.use(requireRole('admin'));

// --- Define specific routes below ---

router.get('/', userController.getAllUsers);

router.get('/pending', userController.getPendingUsers);

router.post(
  '/:id/approve',
  param('id').isUUID(),
  handleValidation,
  userController.approveUser,
);

router.put(
  '/:id',
  param('id').isUUID(),
  body('role').isIn(['admin', 'staff']),
  handleValidation,
  userController.updateUserRole,
);

router.delete(
  '/:id',
  param('id').isUUID(),
  handleValidation,
  userController.deleteUser,
);

module.exports = router;
