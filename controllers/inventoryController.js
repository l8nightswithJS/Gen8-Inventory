// controllers/inventoryController.js
const db = require('../models/db');
const fs = require('fs');
const path = require('path');
const csvWriter = require('fast-csv');

// GET /api/items?client_id=&page=&limit=&q=
function getAllItems(req, res) {
  const client_id = parseInt(req.query.client_id, 10);
  if (!client_id) {
    return res.status(400).json({ message: 'client_id is required' });
  }

  const q = req.query.q || '';
  let page  = parseInt(req.query.page, 10)  || 1;
  let limit = parseInt(req.query.limit, 10) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const offset = (page - 1) * limit;
  const filterSql = q.trim() ? `AND (name LIKE ? OR part_number LIKE ?)` : '';
  const params = q.trim()
    ? [client_id, `%${q}%`, `%${q}%`, limit, offset]
    : [client_id, limit, offset];

  const items = db.prepare(
    `SELECT * FROM items
       WHERE client_id = ?
       ${filterSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`
  ).all(...params);

  const totalCount = db.prepare(
    `SELECT COUNT(*) AS count
       FROM items
       WHERE client_id = ?
       ${filterSql}`
  ).get(...(q.trim() ? [client_id, `%${q}%`, `%${q}%`] : [client_id])).count;

  res.json({
    items,
    total: totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
    limit
  });
}

// GET /api/items/:id
function getItemById(req, res) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }
  res.json(item);
}

// POST /api/items
function createItem(req, res) {
  try {
    const {
      client_id,
      name,
      part_number,
      description = '',
      lot_number = '',
      quantity = 0,
      location = ''
    } = req.body;

    if (!client_id) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const qty = parseInt(quantity, 10) || 0;

    const stmt = db.prepare(
      `INSERT INTO items
         (client_id, name, part_number, description, lot_number, quantity, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      client_id,
      name,
      part_number,
      description,
      lot_number,
      qty,
      location
    );

    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ message: 'Error creating item' });
  }
}

// PUT /api/items/:id
function updateItem(req, res) {
  try {
    const {
      name,
      part_number,
      description = '',
      lot_number = '',
      quantity = 0,
      location = ''
    } = req.body;

    const qty = parseInt(quantity, 10) || 0;

    const stmt = db.prepare(
      `UPDATE items SET
         name        = ?,
         part_number = ?,
         description = ?,
         lot_number  = ?,
         quantity    = ?,
         location    = ?,
         last_updated= CURRENT_TIMESTAMP
       WHERE id = ?`
    );
    const info = stmt.run(
      name,
      part_number,
      description,
      lot_number,
      qty,
      location,
      req.params.id
    );

    if (info.changes === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item updated' });
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ message: 'Error updating item' });
  }
}

// DELETE /api/items/:id
function deleteItem(req, res) {
  const info = db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ message: 'Item not found' });
  }
  res.json({ message: 'Item deleted' });
}

// POST /api/items/bulk
function bulkImportItems(req, res) {
  const client_id = parseInt(req.body.client_id, 10);
  const items = req.body.items;
  if (!client_id) {
    return res.status(400).json({ message: 'client_id is required' });
  }
  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'items must be an array' });
  }

  let successCount = 0;
  let failCount = 0;

  const insert = db.prepare(
    `INSERT INTO items
       (client_id, name, part_number, description, lot_number, quantity, location)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (let item of items) {
    try {
      // ignore completely empty rows
      if (!item.name && !item.part_number && !item.quantity && !item.description && !item.lot_number && !item.location) {
        throw new Error('Empty row');
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty)) {
        throw new Error('Invalid quantity');
      }

      // allow duplicate part_number as long as lot_number differs
      insert.run(
        client_id,
        item.name,
        item.part_number,
        item.description || '',
        item.lot_number || '',
        qty,
        item.location || ''
      );
      successCount++;
    } catch (err) {
      console.error('Bulk import failed for item:', item, err.message);
      failCount++;
    }
  }

  res.json({ successCount, failCount });
}

// GET /api/items/export?client_id=
function exportCSV(req, res) {
  const client_id = parseInt(req.query.client_id, 10);
  if (!client_id) {
    return res.status(400).json({ message: 'client_id is required' });
  }

  const rows = db.prepare('SELECT * FROM items WHERE client_id = ?').all(client_id);

  // ensure tmp folder exists
  const tmpDir = path.join(__dirname, '..', 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  const fileName = `items-export-${Date.now()}.csv`;
  const fullPath = path.join(tmpDir, fileName);
  const ws = fs.createWriteStream(fullPath);

  csvWriter
    .write(rows, { headers: true })
    .pipe(ws)
    .on('finish', () => {
      res.download(fullPath, fileName, err => {
        if (err) console.error('CSV download error:', err);
        fs.unlinkSync(fullPath);
      });
    });
}

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  bulkImportItems,
  exportCSV
};
