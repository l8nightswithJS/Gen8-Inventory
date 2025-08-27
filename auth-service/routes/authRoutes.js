// auth-service/routes/authRoutes.js  (CommonJS)
const express = require('express');
const router = express.Router();

// Import the controller (works with both CJS and ESM default)
let ctrl = require('../controllers/authController'); // do not add .js if your env resolves it
ctrl = ctrl && ctrl.default ? ctrl.default : ctrl;

// Pick the handlers we expect
const { login, register, me, logout } = ctrl || {};

// Validate handlers early with clear messages
const mustBeFn = (fn, name) => {
  if (fn && typeof fn !== 'function') {
    throw new TypeError(
      `authController.${name} must be a function; got ${typeof fn}`,
    );
  }
};

mustBeFn(login, 'login');
mustBeFn(register, 'register');
mustBeFn(me, 'me');
mustBeFn(logout, 'logout');

// NOTE: your API gateway rewrites `/api/auth/*` -> `/*`.
// So exposing `/login` here is correct.
router.post('/login', login);
router.post('/register', register);
router.get('/me', me);
router.post('/logout', logout);

module.exports = router;
