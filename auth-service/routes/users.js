const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const requireRole = require('../middleware/requireRole'); // Import the middleware
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// Protect all routes in this file, allowing only admins
router.use(requireRole('admin'));

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
