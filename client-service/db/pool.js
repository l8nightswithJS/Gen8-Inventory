// client-service/db/pool.js (Corrected)
const { Pool } = require('pg');

// This checks if the code is running on Render (production) or locally.
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ✅ FIX: Only require SSL in production environments.
  // For local development, this will be false.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
