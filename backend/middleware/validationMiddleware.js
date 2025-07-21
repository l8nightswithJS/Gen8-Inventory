// middleware/validationMiddleware.js
const { validationResult } = require('express-validator');

exports.handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const [{ msg, param }] = errors.array();
    return res.status(400).json({ message: `${param}: ${msg}` });
  }
  next();
};
