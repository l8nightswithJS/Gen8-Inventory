// inventory-service/controllers/inventoryController.js
const pool = require('../db/pool');
const {
  computeLowState,
  cleanAttributes,
  normalizeKey,
} = require('./_stockLogic');

// ---------- helpers ----------
function rowToItem(row) {
  return {
    id: row.id,
    client_id: row.client_id,
    attributes: row.attributes || {},
    created_at: row.created_at || null,
    updated_at: row.last_updated || row.updated_at || null,
  };
}

// When an item is not low, erase the acknowledgement flag if present.
function autoResetAcknowledge(attrs = {}) {
  const a = { ...attrs };
  const { low } = computeLowState(a);
  if (!low && 'alert_acknowledged_at' in a) {
    delete a.alert_acknowledged_at;
  }
  return a;
}

// ---------- Alerts ----------

// GET /api/items/alerts?client_id=123
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const result = await pool.query(
      'SELECT id, client_id, attributes, last_updated FROM items WHERE client_id = $1',
      [clientId],
    );

    const alerts = result.rows.flatMap((row) => {
      const attrs = row.attributes || {};
      if (attrs.alert_acknowledged_at) return [];

      const { low, reason, threshold, qty } = computeLowState(attrs);
      if (!low) return [];

      return [
        {
          id: row.id,
          triggered_at: row.last_updated || new Date().toISOString(),
          item: { id: row.id, client_id: row.client_id, attributes: attrs },
          reason,
          threshold,
          qty,
        },
      ];
    });

    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

// POST /api/items/alerts/:id/acknowledge
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const existing = await pool.query(
      'SELECT attributes FROM items WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    const attrs = existing.rows[0].attributes || {};
    if (attrs.alert_acknowledged_at) {
      return res.json({ message: 'Already acknowledged' });
    }

    const updated = {
      ...attrs,
      alert_acknowledged_at: new Date().toISOString(),
    };

    await pool.query('UPDATE items SET attributes = $1 WHERE id = $2', [
      updated,
      id,
    ]);

    res.json({ message: 'Acknowledged' });
  } catch (err) {
    next(err);
  }
};

// ---------- Items CRUD ----------

// GET /api/items?client_id=123
exports.listItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const result = await pool.query(
      'SELECT * FROM items WHERE client_id = $1 ORDER BY id ASC',
      [clientId],
    );
    res.json(result.rows.map(rowToItem));
  } catch (err) {
    next(err);
  }
};

// GET /api/items/:id
exports.getItemById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const result = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json(rowToItem(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

// POST /api/items
exports.createItem = async (req, res, next) => {
  try {
    const { client_id, attributes } = req.body || {};
    const clientId = Number(client_id);
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }
    if (!attributes || typeof attributes !== 'object') {
      return res.status(400).json({ message: 'attributes object is required' });
    }

    const cleaned = autoResetAcknowledge(cleanAttributes(attributes));

    const result = await pool.query(
      'INSERT INTO items (client_id, attributes) VALUES ($1, $2) RETURNING *',
      [clientId, cleaned],
    );

    res.status(201).json(rowToItem(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

// PUT /api/items/:id?merge=true
exports.updateItem = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const merge = String(req.query.merge || '').toLowerCase() === 'true';
    const { attributes } = req.body || {};
    if (!attributes || typeof attributes !== 'object') {
      return res.status(400).json({ message: 'attributes object is required' });
    }

    const cleaned = cleanAttributes(attributes);
    let newAttributes = cleaned;

    if (merge) {
      const existing = await pool.query(
        'SELECT attributes FROM items WHERE id = $1',
        [id],
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ message: 'Not found' });
      }

      const prior = existing.rows[0].attributes || {};
      newAttributes = { ...prior, ...cleaned };

      for (const [rawKey, rawVal] of Object.entries(attributes)) {
        const key = normalizeKey(rawKey);
        if (!key) continue;
        if (
          rawVal === null ||
          (typeof rawVal === 'string' && rawVal.trim() === '')
        ) {
          delete newAttributes[key];
        }
      }
    }

    newAttributes = autoResetAcknowledge(newAttributes);

    const result = await pool.query(
      'UPDATE items SET attributes = $1, last_updated = NOW() WHERE id = $2 RETURNING *',
      [newAttributes, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json(rowToItem(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const result = await pool.query(
      'DELETE FROM items WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/items/bulk
exports.bulkImportItems = async (req, res, next) => {
  try {
    const clientId = Number(req.body.client_id);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }
    if (items.length === 0) {
      return res
        .status(400)
        .json({ message: 'items must be a non-empty array' });
    }

    const rows = items
      .map((row) => (row && row.attributes ? row.attributes : row))
      .filter((obj) => obj && typeof obj === 'object')
      .map((obj) => ({
        client_id: clientId,
        attributes: autoResetAcknowledge(cleanAttributes(obj)),
      }));

    if (rows.length === 0) {
      return res.status(400).json({ message: 'No valid item rows' });
    }

    const inserted = await pool.query(
      'INSERT INTO items (client_id, attributes) VALUES ' +
        rows.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ') +
        ' RETURNING *',
      rows.flatMap((r) => [r.client_id, r.attributes]),
    );

    res.status(201).json({
      message: 'Bulk import successful',
      successCount: inserted.rows.length,
      failCount: rows.length - inserted.rows.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/items/export?client_id=123
exports.exportItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const result = await pool.query(
      'SELECT id, client_id, attributes, last_updated FROM items WHERE client_id = $1 ORDER BY id ASC',
      [clientId],
    );

    const rows = result.rows || [];
    const keys = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r.attributes || {}))),
    );

    const header = ['id', 'client_id', 'last_updated', ...keys];
    const csvLines = [header.join(',')];

    for (const r of rows) {
      const base = [r.id, r.client_id, r.last_updated || ''];
      const attrs = r.attributes || {};
      const vals = keys.map((k) => {
        const v = attrs[k];
        if (v == null) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      csvLines.push([...base, ...vals].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="items.csv"');
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
};
