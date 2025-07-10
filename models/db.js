const Database = require('better-sqlite3');
const db = new Database('inventory.db');

// Ensure foreign key constraints are enforced
db.pragma('foreign_keys = ON');

// Create users table
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create clients table
db.prepare(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT
  )
`).run();

// Drop and recreate items table WITH has_lot column
db.prepare('DROP TABLE IF EXISTS items').run();
db.prepare(`
  CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    part_number TEXT NOT NULL,
    description TEXT,
    lot_number TEXT,
    quantity INTEGER NOT NULL,
    location TEXT,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
    has_lot INTEGER DEFAULT 1,
    client_id INTEGER NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE (name, client_id),
    UNIQUE (part_number, client_id)
  )
`).run();

module.exports = db;
