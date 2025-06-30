const db = require('../models/db');
const fs = require('fs');
const path = require('path');
const csvWriter = require('fast-csv');

// GET all items with optional search
exports.getAllItems = (req, res) => {
  const client_id = parseInt(req.query.client_id, 10);
  const q = req.query.q || '';
  if (!client_id) return res.status(400).json({ message: 'client_id is required' });

  let page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  const offset = (page - 1) * limit;

  const queryFilter = q.trim() ? `AND (name LIKE ? OR part_number LIKE ?)` : '';
  const params = q.trim()
    ? [client_id, `%${q}%`, `%${q}%`, limit, offset]
    : [client_id, limit, offset];

  const items = db.prepare(
    `SELECT * FROM items WHERE client_id = ? ${queryFilter} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...params);

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM items WHERE client_id = ? ${queryFilter}`
  ).get(...(q.trim() ? [client_id, `%${q}%`, `%${q}%`] : [client_id])).count;

  res.json({
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit
  });
};

exports.getItemById = (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json(item);
};

exports.createItem = (req, res) => {
  try {
    let {
      client_id, name, part_number, description,
      lot_number, quantity, location, has_lot = 1,
      attributes = {}
    } = req.body;

    if (!client_id) return res.status(400).json({ message: 'client_id is required' });
    quantity = parseInt(quantity);
    has_lot = has_lot ? 1 : 0;
    const attrString = JSON.stringify(attributes);

    const result = db.prepare(
      'INSERT INTO items (client_id, name, part_number, description, lot_number, quantity, location, has_lot, attributes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(client_id, name, part_number, description, lot_number, quantity, location, has_lot, attrString);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: 'Name or Part Number must be unique for this client.' });
    }
    res.status(500).json({ message: 'Server error during item creation' });
  }
};

exports.updateItem = (req, res) => {
  try {
    const {
      name, part_number, description, lot_number,
      quantity, location, has_lot = 1, attributes = {}
    } = req.body;

    const attrString = JSON.stringify(attributes);

    const result = db.prepare(
      'UPDATE items SET name = ?, part_number = ?, description = ?, lot_number = ?, quantity = ?, location = ?, has_lot = ?, attributes = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, part_number, description, lot_number, quantity, location, has_lot ? 1 : 0, attrString, req.params.id);

    if (result.changes === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item updated' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: 'Name or Part Number must be unique for this client.' });
    }
    res.status(500).json({ message: 'Server error during item update' });
  }
};


exports.deleteItem = (req, res) => {
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Item not found' });
  res.json({ message: 'Item deleted' });
};

exports.bulkImportItems = (req, res) => {
  let client_id = parseInt(req.body.client_id, 10);
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ message: 'Invalid data format' });

  let successCount = 0;
  let failCount = 0;

  items.forEach(item => {
    try {
      const cid = item.client_id ? parseInt(item.client_id, 10) : client_id;
      if (!cid) throw new Error('No client_id');
      const hasLot = item.has_lot ? 1 : 0;
      db.prepare(
        'INSERT INTO items (client_id, name, part_number, description, lot_number, quantity, location, has_lot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        cid,
        item.name,
        item.part_number,
        item.description,
        item.lot_number,
        parseInt(item.quantity, 10) || 0,
        item.location,
        hasLot
      );
      successCount++;
    } catch (error) {
      failCount++;
    }
  });

  res.json({ successCount, failCount });
};

exports.exportCSV = (req, res) => {
  const client_id = parseInt(req.query.client_id, 10);
  if (!client_id) return res.status(400).json({ message: 'client_id is required' });

  const rows = db.prepare('SELECT * FROM items WHERE client_id = ?').all(client_id);
  const tempPath = path.join(__dirname, '..', 'tmp');
  const fileName = `items-export-${Date.now()}.csv`;
  const fullPath = path.join(tempPath, fileName);

  fs.mkdirSync(tempPath, { recursive: true });
  const ws = fs.createWriteStream(fullPath);

  csvWriter
    .write(rows.map(r => ({ ...r, has_lot: r.has_lot ? 1 : 0 })), { headers: true })
    .pipe(ws)
    .on('finish', () => res.download(fullPath, fileName, () => fs.unlinkSync(fullPath)));
};
