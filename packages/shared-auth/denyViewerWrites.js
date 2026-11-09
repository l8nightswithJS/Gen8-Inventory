// Prevent read-only accounts from using inventory-changing HTTP endpoints.
// Role is taken from the verified application JWT by authMiddleware.
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function denyViewerWrites(req, res, next) {
  if (req.user?.role === 'external_viewer' && !READ_METHODS.has(req.method)) {
    return res.status(403).json({ message: 'Read-only account: this action is not permitted.' });
  }
  return next();
}

module.exports = denyViewerWrites;
