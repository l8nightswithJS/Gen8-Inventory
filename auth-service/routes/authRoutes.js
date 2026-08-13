const express = require('express');
const { authMiddleware } = require('shared-auth');
const {
  login,
  register,
  verifyToken,
  me,
  logout,
} = require('../controllers/authController');
const refreshSession = require('../controllers/refreshController');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/verify', authMiddleware, verifyToken);
router.get('/me', authMiddleware, me);
router.post('/refresh', authMiddleware, refreshSession);
router.post('/logout', authMiddleware, logout);

module.exports = router;
