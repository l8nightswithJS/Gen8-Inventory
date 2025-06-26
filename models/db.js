const Database = require('better-sqlite3');
const db = new Database('inventory.db');

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
// Add logo_url field to clients table (requires db wipe if changing schema)
db.prepare(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT
  )
`).run();


// Create items table with client_id as foreign key
db.prepare(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    part_number TEXT NOT NULL,
    description TEXT,
    lot_number TEXT,
    quantity INTEGER NOT NULL,
    location TEXT,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
    client_id INTEGER NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    UNIQUE (name, client_id),
    UNIQUE (part_number, client_id)
  )
`).run();



module.exports = db;
