// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error'
  });
};
