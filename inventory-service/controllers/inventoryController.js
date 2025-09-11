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

exports.adjustInventory = async (req, res, next) => {
  try {
    const { item_id, location_id, change_quantity } = req.body;

    // This is the atomic database operation.
    // It tells PostgreSQL to find the matching row and mathematically
    // add the change_quantity, preventing any race conditions.
    const result = await pool.query(
      `INSERT INTO inventory (item_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (item_id, location_id)
       DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
       RETURNING quantity`,
      [item_id, location_id, change_quantity],
    );

    if (result.rows.length === 0) {
      // This case is unlikely with the UPSERT, but good for safety
      return res
        .status(404)
        .json({ message: 'Could not update inventory record.' });
    }

    res.json({
      message: 'Inventory updated successfully',
      item_id,
      location_id,
      new_quantity: result.rows[0].quantity,
    });
  } catch (err) {
    // Handle cases like negative inventory if you add a CHECK constraint
    if (err.code === '23514') {
      // check_violation error code
      return res
        .status(409)
        .json({ message: 'Update failed: quantity cannot be negative.' });
    }
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

    // This new query joins items with inventory and sums the quantities
    const result = await pool.query(
      `SELECT
          i.id,
          i.client_id,
          i.attributes,
          i.last_updated,
          i.sku,
          i.description,
          COALESCE(SUM(inv.quantity), 0)::int AS total_quantity
       FROM items i
       LEFT JOIN inventory inv ON i.id = inv.item_id
       WHERE i.client_id = $1
       GROUP BY i.id
       ORDER BY i.id ASC`,
      [clientId],
    );

    // The response now includes the total_quantity for each item
    res.json(result.rows);
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

    // This query gets item details and a JSON array of its inventory levels
    const itemResult = await pool.query(
      `SELECT
          i.id,
          i.client_id,
          i.attributes,
          i.last_updated,
          i.sku,
          i.description,
          (
            SELECT COALESCE(json_agg(
              json_build_object(
                'location_id', inv.location_id,
                'location_code', loc.code,
                'quantity', inv.quantity
              )
            ), '[]'::json)
            FROM inventory inv
            JOIN locations loc ON inv.location_id = loc.id
            WHERE inv.item_id = i.id
          ) as inventory_levels
       FROM items i
       WHERE i.id = $1`,
      [id],
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json(itemResult.rows[0]);
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

exports.getMasterInventoryByLocation = async (req, res, next) => {
  try {
    // This single query joins locations, inventory, items, and clients,
    // and uses PostgreSQL's JSON functions to build a nested response.
    const query = `
      SELECT
        l.id AS location_id,
        l.code AS location_code,
        l.description AS location_description,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'item_id', i.id,
              'sku', i.sku,
              'item_description', i.description,
              'client_id', c.id,
              'client_name', c.name,
              'quantity', inv.quantity
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM locations l
      LEFT JOIN inventory inv ON l.id = inv.location_id
      LEFT JOIN items i ON inv.item_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      GROUP BY l.id
      ORDER BY l.code;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
