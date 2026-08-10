const verifyJwt = require('./verifyJwt');
const authMiddleware = require('./authMiddleware');
const requireRole = require('./requireRole');
const requireClientMatch = require('./requireClientMatch');
const requireClientPermission = require('./requireClientPermission');
const { handleValidation } = require('./validationMiddleware');
const errorHandler = require('./errorHandler');

module.exports = {
  verifyJwt,
  authMiddleware,
  requireRole,
  requireClientMatch,
  requireClientPermission,
  handleValidation,
  errorHandler,
};
