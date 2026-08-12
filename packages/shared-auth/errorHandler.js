function errorHandler(err, _req, res, _next) {
  const status = Number(err?.status || err?.statusCode) || 500;

  console.error('[ERROR]', {
    name: err?.name,
    code: err?.code,
    status,
    message: err?.message,
  });

  if (err?.name === 'MulterError' && err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: true,
      message: 'Uploaded file is too large.',
    });
  }

  if (status >= 500) {
    return res.status(status).json({
      error: true,
      message: 'Internal server error.',
    });
  }

  return res.status(status).json({
    error: true,
    message: err?.message || 'Request failed.',
  });
}

module.exports = errorHandler;
