// auth-service/routes/users.js (Correctly Ordered)
const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { requireRole, handleValidation } = require('shared-auth');

const router = express.Router();

// Protect all routes in this file, allowing only admins
router.use(requireRole('admin'));

// --- ROUTES (ORDER MATTERS!) ---

// Most specific routes first
router.get('/pending', userController.getPendingUsers);

// Routes with a specific sub-path
router.get(
  '/:id/clients',
  param('id').isUUID(),
  handleValidation,
  userController.getUserClients,
);

router.post(
  '/:id/approve',
  param('id').isUUID(),
  handleValidation,
  userController.approveUser,
);

// General routes last
router.get('/', userController.getAllUsers);

router.put(
  '/:id',
  param('id').isUUID(),
  body('role').isIn(['admin', 'staff']),
  // client_id is now optional
  body('client_id').optional({ nullable: true }).isInt(),
  handleValidation,
  userController.updateUser, // Assuming you renamed updateUserRole to updateUser
);

router.put(
  '/:id/clients',
  param('id').isUUID(),
  body('client_ids').isArray(),
  body('client_ids.*').isInt(),
  handleValidation,
  userController.updateUserClients,
);

router.delete(
  '/:id',
  param('id').isUUID(),
  handleValidation,
  userController.deleteUser,
);

module.exports = router;
