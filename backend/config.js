require('dotenv').config();

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
  PORT: process.env.PORT || 8000
};
