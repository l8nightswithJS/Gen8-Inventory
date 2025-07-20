// routes/users.js
const express     = require('express');
const { param }   = require('express-validator');
const controller  = require('../controllers/userController');
const authenticate= require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { handleValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

// all /api/users require auth + admin
router.use(authenticate);
router.use(requireRole('admin'));

// existing CRUD…
router.get('/', controller.getAllUsers);
router.get('/:id', /*…*/);
router.post('/', /*…*/);
router.put('/:id', /*…*/);
router.delete('/:id', /*…*/);

// new endpoints:
router.get('/pending', controller.getPendingUsers);

router.put(
  '/:id/approve',
  param('id').isInt(),
  handleValidation,
  controller.approveUser
);

module.exports = router;
