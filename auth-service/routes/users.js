// In auth-service/routes/users.js (Complete File)
const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { requireRole, handleValidation } = require('shared-auth');

const router = express.Router();

router.use(requireRole('admin'));

// --- ROUTES (Correctly Ordered) ---

// General user lists
router.get('/pending', userController.getPendingUsers);
router.get('/', userController.getAllUsers);

// Specific actions for a user ID
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

// General wildcard for a user ID (must be last)
router.put(
  '/:id',
  param('id').isUUID(),
  body('role').isIn(['admin', 'staff']),
  handleValidation,
  userController.updateUser,
);
router.delete(
  '/:id',
  param('id').isUUID(),
  handleValidation,
  userController.deleteUser,
);

module.exports = router;
