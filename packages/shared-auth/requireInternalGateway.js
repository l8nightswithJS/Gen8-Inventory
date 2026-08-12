const crypto = require('crypto');

const HEADER_NAME = 'x-internal-gateway-key';

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
}

function safeEqual(actual, expected) {
  const left = Buffer.from(String(actual || ''), 'utf8');
  const right = Buffer.from(String(expected || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireInternalGateway(req, res, next) {
  const expected = process.env.INTERNAL_GATEWAY_KEY;

  if (!expected) {
    if (isProductionRuntime()) {
      return res.status(503).json({ message: 'Service gateway is not configured.' });
    }
    return next();
  }

  const actual = req.get(HEADER_NAME);
  if (!safeEqual(actual, expected)) {
    // Deliberately do not reveal that a private service endpoint exists.
    return res.status(404).json({ message: 'Not found.' });
  }

  return next();
}

requireInternalGateway.HEADER_NAME = HEADER_NAME;
requireInternalGateway._test = { isProductionRuntime, safeEqual };

module.exports = requireInternalGateway;
