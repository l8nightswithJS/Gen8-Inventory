// routes/users.js
const express               = require('express');
const { body, param }       = require('express-validator');
const controller            = require('../controllers/userController');
const authenticate          = require('../middleware/authMiddleware');
const requireRole           = require('../middleware/requireRole');
const { handleValidation }  = require('../middleware/validationMiddleware');

const router = express.Router();

// all /api/users routes require authentication + admin
router.use(authenticate);
router.use(requireRole('admin'));

// GET /api/users               → list all approved users
router.get('/', controller.getAllUsers);

// GET /api/users/pending       → list pending (approved=false) sign‑ups
router.get('/pending', controller.getPendingUsers);

// GET /api/users/:id           → get single user
router.get(
  '/:id',
  param('id').isInt().withMessage('Invalid user ID'),
  handleValidation,
  controller.getUserById
);

// POST /api/users              → create (admin only)
router.post(
  '/',
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be ≥6 chars'),
  body('role').isIn(['admin','staff']).withMessage('Role must be admin or staff'),
  handleValidation,
  controller.createUser
);

// PUT /api/users/:id/approve   → approve a pending sign‑up
router.put(
  '/:id/approve',
  param('id').isInt().withMessage('Invalid user ID'),
  handleValidation,
  controller.approveUser
);

// PUT /api/users/:id           → update username/password/role
router.put(
  '/:id',
  param('id').isInt().withMessage('Invalid user ID'),
  body('username').optional().isString().notEmpty(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be ≥6 chars'),
  body('role').optional().isIn(['admin','staff']),
  handleValidation,
  controller.updateUser
);

// DELETE /api/users/:id        → delete user
router.delete(
  '/:id',
  param('id').isInt().withMessage('Invalid user ID'),
  handleValidation,
  controller.deleteUser
);

module.exports = router;
