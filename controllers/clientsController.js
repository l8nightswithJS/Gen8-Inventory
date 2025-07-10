const db = require('../models/db'); // make sure this path matches your actual db.js
const path = require('path');

exports.getAllClients = (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM clients ORDER BY id DESC');
    const clients = stmt.all();
    res.json(clients);
  } catch (err) {
    console.error('Error loading clients:', err.message);
    res.status(500).json({ message: 'Failed to load clients' });
  }
};

exports.getClientById = (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    const client = stmt.get(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get client' });
  }
};

exports.createClient = (req, res) => {
  try {
    const { name, logo_url } = req.body;
    let finalLogoUrl = logo_url;

    if (req.file) {
      finalLogoUrl = `/uploads/${req.file.filename}`;
    }

    const stmt = db.prepare('INSERT INTO clients (name, logo_url) VALUES (?, ?)');
    const info = stmt.run(name, finalLogoUrl);
    res.status(201).json({ id: info.lastInsertRowid, name, logo_url: finalLogoUrl });
  } catch (err) {
    console.error('Create client error:', err.message);
    res.status(500).json({ message: 'Failed to create client' });
  }
};

exports.updateClient = (req, res) => {
  try {
    const { name, logo_url } = req.body;
    const id = req.params.id;
    let finalLogoUrl = logo_url;

    if (req.file) {
      finalLogoUrl = `/uploads/${req.file.filename}`;
    }

    const stmt = db.prepare('UPDATE clients SET name = ?, logo_url = ? WHERE id = ?');
    const info = stmt.run(name, finalLogoUrl, id);

    if (info.changes === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ id, name, logo_url: finalLogoUrl });
  } catch (err) {
    console.error('Update client error:', err.message);
    res.status(500).json({ message: 'Failed to update client' });
  }
};

exports.deleteClient = (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
    const info = stmt.run(req.params.id);

    if (info.changes === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete client' });
  }
};
