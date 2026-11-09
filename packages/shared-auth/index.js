const verifyJwt = require('./verifyJwt');
const authMiddleware = require('./authMiddleware');
const requireRole = require('./requireRole');
const requireClientMatch = require('./requireClientMatch');
const denyViewerWrites = require('./denyViewerWrites');
const { handleValidation } = require('./validationMiddleware');
const errorHandler = require('./errorHandler');

module.exports = {
  verifyJwt,
  authMiddleware,
  requireRole,
  requireClientMatch,
  denyViewerWrites,
  handleValidation,
  errorHandler,
};
