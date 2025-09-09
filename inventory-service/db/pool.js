// inventory-service/db/pool.js (Updated)
const { Pool } = require('pg');

// Render automatically sets NODE_ENV to 'production'.
// When you run the script locally, this will be undefined.
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Only enforce SSL when in a production environment.
  // For local development, this will be false.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
