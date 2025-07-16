// models/initDb.js
require('dotenv').config();

/**
 * Initializes and verifies required database tables in Postgres.
 */
async function initDb() {
  // Require db inside function to avoid circular dependency
  const db = require('./db');

  // 1) Users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      username    TEXT    UNIQUE NOT NULL,
      password    TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'staff',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `, []);

  // 2) Clients table
  await db.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id       SERIAL PRIMARY KEY,
      name     TEXT    UNIQUE NOT NULL,
      logo_url TEXT
    );
  `, []);

  // 3) Items table (drop & recreate)
  await db.query(`DROP TABLE IF EXISTS items;`, []);
  await db.query(`
    CREATE TABLE items (
      id           SERIAL PRIMARY KEY,
      name         TEXT    NOT NULL,
      part_number  TEXT    NOT NULL,
      description  TEXT,
      lot_number   TEXT,
      quantity     INTEGER NOT NULL,
      location     TEXT,
      last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      has_lot      BOOLEAN NOT NULL DEFAULT TRUE,
      client_id    INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      UNIQUE (name, client_id),
      UNIQUE (part_number, client_id)
    );
  `, []);

  console.log('✅ Tables are created or verified.');
}

// If this file is run directly, execute initDb
if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('🛑 initDb error:', err);
      process.exit(1);
    });
}

module.exports = initDb;
