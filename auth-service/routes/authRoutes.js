// auth-service/routes/authRoutes.js
const express = require('express');
const router = express.Router();

let ctrl = require('../controllers/authController');
ctrl = ctrl && ctrl.default ? ctrl.default : ctrl;

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

// ✅ Use shared-auth middleware instead of local one
const { authMiddleware } = require('shared-auth');

// Public routes
router.post('/login', login);
router.post('/register', register);

// Used by other services (legacy flow)
router.post('/verify', authMiddleware, verifyToken || verify);

// Identity route
router.get('/me', authMiddleware, me);

// Session end
router.post('/logout', authMiddleware, logout);

module.exports = router;
