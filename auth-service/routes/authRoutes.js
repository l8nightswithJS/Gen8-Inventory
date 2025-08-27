// auth-service/routes/authRoutes.js  (CommonJS)
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

// Public routes
router.post('/login', login);
router.post('/register', register);

// Used by other services (middleware hits /api/auth/verify)
router.post('/verify', verifyToken || verify);

// Convenience identity route
router.get('/me', me);

// Session end
router.post('/logout', logout);

module.exports = router;
