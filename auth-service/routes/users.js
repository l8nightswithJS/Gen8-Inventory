const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { requireRole, handleValidation } = require('shared-auth');

const router = express.Router();
const roles = ['admin', 'inventory_staff', 'project_user', 'external_viewer'];

router.use(requireRole('admin'));

router.get('/pending', userController.getPendingUsers);
router.get('/', userController.getAllUsers);

router.post(
  '/',
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8 }),
  body('role').isIn(roles),
  body('assigned_clients').optional().isArray(),
  handleValidation,
  userController.createUser,
);

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
  body('assignments').optional().isArray(),
  body('client_ids').optional().isArray(),
  handleValidation,
  userController.updateUserClients,
);

router.put(
  '/:id',
  param('id').isUUID(),
  body('role').optional().isIn(roles),
  body('assigned_clients').optional().isArray(),
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
