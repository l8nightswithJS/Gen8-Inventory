const db = require('../models/db');

exports.getAllClients = (req, res) => {
  const clients = db.prepare('SELECT * FROM clients').all();
  res.json(clients);
};

exports.getClientById = (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  res.json(client);
};

exports.createClient = (req, res) => {
  const { name, logo_url } = req.body;
  try {
    const result = db.prepare('INSERT INTO clients (name, logo_url) VALUES (?, ?)')
      .run(name, logo_url || null);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ message: 'Client name must be unique.' });
  }
};

exports.updateClient = (req, res) => {
  const { name, logo_url } = req.body;
  try {
    const result = db.prepare(
      'UPDATE clients SET name = ?, logo_url = ? WHERE id = ?'
    ).run(name, logo_url || null, req.params.id);
    if (result.changes === 0)
      return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client updated' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: 'Client name must be unique.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteClient = (req, res) => {
  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'Client not found' });
  }
  res.json({ message: 'Client deleted' });
};
