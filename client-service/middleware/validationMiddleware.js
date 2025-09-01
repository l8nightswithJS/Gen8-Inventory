// client-service/middleware/validationMiddleware.js
const { validationResult } = require('express-validator');

exports.handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // The error object key is 'path', not 'param'. This change fixes the error message.
    const [{ msg, path }] = errors.array();
    return res.status(400).json({ message: `${path}: ${msg}` });
  }
  next();
};
