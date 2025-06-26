const bcrypt = require('bcryptjs');
const db = require('./models/db');

const username = 'admin';
const plainPassword = 'admin123'; // ← Change this later
const role = 'admin';

const hash = bcrypt.hashSync(plainPassword, 10);

try {
  db.prepare(`
    INSERT INTO users (username, password, role)
    VALUES (?, ?, ?)
  `).run(username, hash, role);

  console.log(`✅ Admin user '${username}' created successfully.`);
} catch (err) {
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    console.log(`⚠️ Admin user '${username}' already exists.`);
  } else {
    console.error('❌ Error creating admin:', err.message);
  }
}
