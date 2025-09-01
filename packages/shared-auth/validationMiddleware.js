// packages/shared-auth/validationMiddleware.js
const { validationResult } = require('express-validator');

/**
 * Middleware to check the results of express-validator chains.
 * If validation errors exist, responds with 400 and details.
 * Otherwise, calls next().
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
}

module.exports = { handleValidation };
