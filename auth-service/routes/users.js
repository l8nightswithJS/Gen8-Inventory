// auth-service/routes/users.js (Corrected and Final Version)
const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { requireRole, handleValidation } = require('shared-auth');

const router = express.Router();

// Protect all subsequent routes in this file, allowing only admins
router.use(requireRole('admin'));

// --- ROUTES (Correctly Ordered) ---

// 1. Most specific routes first
router.get('/pending', userController.getPendingUsers);
router.get('/', userController.getAllUsers);

// 2. Routes with a specific sub-path for a user ID
router.post(
  '/:id/approve',
  param('id').isUUID(),
  handleValidation,
  userController.approveUser,
);

router.get(
  '/:id/clients',
  param('id').isUUID(),
  handleValidation,
  userController.getUserClients,
);

router.put(
  '/:id/clients',
  param('id').isUUID(),
  body('client_ids').isArray(),
  body('client_ids.*').isInt(),
  handleValidation,
  userController.updateUserClients,
);

// 3. General (wildcard) routes for a user ID last
router.put(
  '/:id',
  param('id').isUUID(),
  body('role').isIn(['admin', 'staff']),
  handleValidation,
  userController.updateUser, // CORRECTED: Renamed from updateUserRole
);

router.delete(
  '/:id',
  param('id').isUUID(),
  handleValidation,
  userController.deleteUser,
);

// REMOVED: The old '/:id/assign-client' route is now obsolete.

module.exports = router;
