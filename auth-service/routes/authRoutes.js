// auth-service/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('shared-auth');

let ctrl = require('../controllers/authController');
ctrl = ctrl && ctrl.default ? ctrl.default : ctrl;
const refreshSession = require('../controllers/refreshController');

const { login, register, verify, verifyToken, me, logout } = ctrl || {};

function mustBeFn(fn, name) {
  if (typeof fn !== 'function') {
    throw new TypeError(
      `authController.${name} must be a function; got ${typeof fn}`,
    );
  }
}
mustBeFn(login, 'login');
mustBeFn(register, 'register');
mustBeFn(verifyToken || verify, 'verifyToken');
mustBeFn(me, 'me');
mustBeFn(logout, 'logout');
mustBeFn(refreshSession, 'refreshSession');

router.use((req, _res, next) => {
  console.log(`[authRoutes] ${req.method} ${req.originalUrl}`);
  next();
});

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected identity/session routes
router.post('/verify', authMiddleware, verifyToken || verify);
router.get('/me', authMiddleware, me);
router.post('/refresh', authMiddleware, refreshSession);
router.post('/logout', authMiddleware, logout);

module.exports = router;
