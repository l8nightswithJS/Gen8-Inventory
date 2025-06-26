const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

// All routes below are admin-only
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', controller.getAllUsers);
router.get('/:id', controller.getUserById);
router.post('/', controller.createUser);
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;
