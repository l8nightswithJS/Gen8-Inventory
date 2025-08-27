// auth-service/routes/authRoutes.js  (CommonJS)
const express = require('express');
const router = express.Router();

// Import the controller (supports both CJS and ESM default export)
let ctrl = require('../controllers/authController');
ctrl = ctrl && ctrl.default ? ctrl.default : ctrl;

// Grab existing handlers from the controller
const { login, register, verifyToken } = ctrl || {};

// Assert the handlers exist and are functions (fail early with a clear message)
const requireFn = (fn, name) => {
  if (typeof fn !== 'function') {
    throw new TypeError(
      `authController.${name} must be a function; got ${typeof fn}`,
    );
  }
};
requireFn(login, 'login');
requireFn(register, 'register');
requireFn(verifyToken, 'verifyToken');

// Routes (your gateway rewrites /api/auth/* → /* here)
router.post('/login', login);
router.post('/register', register);
router.post('/verify', verifyToken);

module.exports = router;
