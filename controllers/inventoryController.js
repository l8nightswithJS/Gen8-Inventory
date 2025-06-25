const db = require('../models/db');

// GET all items for a specific client
exports.getAllItems = (req, res) => {
  const client_id = parseInt(req.query.client_id, 10);
  if (!client_id) return res.status(400).json({ message: 'client_id is required' });

  let page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const offset = (page - 1) * limit;

  // Only count items for this client
  const total = db.prepare('SELECT COUNT(*) as count FROM items WHERE client_id = ?').get(client_id).count;
  const items = db.prepare('SELECT * FROM items WHERE client_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(client_id, limit, offset);

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

// CREATE item for specific client
exports.createItem = (req, res) => {
  try {
    let { client_id, name, part_number, description, lot_number, quantity, location } = req.body;
    if (!client_id) return res.status(400).json({ message: 'client_id is required' });
    quantity = parseInt(quantity);

    const result = db.prepare(
      'INSERT INTO items (client_id, name, part_number, description, lot_number, quantity, location) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(client_id, name, part_number, description, lot_number, quantity, location);

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
    const { name, part_number, description, lot_number, quantity, location } = req.body;
    const result = db.prepare(
      'UPDATE items SET name = ?, part_number = ?, description = ?, lot_number = ?, quantity = ?, location = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, part_number, description, lot_number, quantity, location, req.params.id);

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

// BULK IMPORT SUPPORT (now requires client_id for each item or for the whole batch)
exports.bulkImportItems = (req, res) => {
  let client_id = parseInt(req.body.client_id, 10);
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ message: 'Invalid data format' });

  let successCount = 0;
  let failCount = 0;

  items.forEach(item => {
    try {
      // allow per-item client_id or fallback to batch client_id
      const cid = item.client_id ? parseInt(item.client_id, 10) : client_id;
      if (!cid) throw new Error('No client_id');
      db.prepare(
        'INSERT INTO items (client_id, name, part_number, description, lot_number, quantity, location) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        cid,
        item.name,
        item.part_number,
        item.description,
        item.lot_number,
        parseInt(item.quantity, 10) || 0,
        item.location
      );
      successCount++;
    } catch (error) {
      failCount++;
    }
  });

  res.json({ successCount, failCount });
};
