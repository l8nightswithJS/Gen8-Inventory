// packages/shared-auth/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  const status = err.status || 500;
  res.status(status).json({
    error: true,
    message: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;
