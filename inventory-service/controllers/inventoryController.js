// inventory-service/controllers/inventoryController.js
const supabase = require('../lib/supabaseClient');
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
    // our table has last_updated; some environments may also have updated_at
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
// Return ONLY items that are low AND not acknowledged
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const { data: items, error } = await supabase
      .from('items')
      .select('id, client_id, attributes, last_updated')
      .eq('client_id', clientId);

    if (error) throw error;

    const alerts = (items || []).flatMap((row) => {
      const attrs = row.attributes || {};
      if (attrs.alert_acknowledged_at) return [];

      const { low, reason, threshold, qty } = computeLowState(attrs);
      if (!low) return [];

      return [
        {
          id: row.id, // keep id simple for the acknowledge endpoint
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

    const { data: existing, error: exErr } = await supabase
      .from('items')
      .select('attributes')
      .eq('id', id)
      .single();
    if (exErr) throw exErr;

    const attrs = (existing && existing.attributes) || {};
    if (attrs.alert_acknowledged_at) {
      return res.json({ message: 'Already acknowledged' });
    }

    const updated = {
      ...attrs,
      alert_acknowledged_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from('items')
      .update({ attributes: updated })
      .eq('id', id);
    if (upErr) throw upErr;

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

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('client_id', clientId)
      .order('id', { ascending: true });

    if (error) throw error;
    res.json((data || []).map(rowToItem));
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

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Not found' });

    res.json(rowToItem(data));
  } catch (err) {
    next(err);
  }
};

// POST /api/items { client_id, attributes }
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

    const { data, error } = await supabase
      .from('items')
      .insert([{ client_id: clientId, attributes: cleaned }])
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(rowToItem(data));
  } catch (err) {
    next(err);
  }
};

// PUT /api/items/:id?merge=true { attributes }
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

    // Clean the values, but keep the raw payload so we can detect explicit clears.
    const cleaned = cleanAttributes(attributes);
    let newAttributes = cleaned;

    if (merge) {
      const { data: existing, error: exErr } = await supabase
        .from('items')
        .select('attributes')
        .eq('id', id)
        .single();
      if (exErr) throw exErr;

      const prior = (existing && existing.attributes) || {};
      newAttributes = { ...prior, ...cleaned };

      // explicit clears: if payload sent "" or null for a key, drop it
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

    const { data, error } = await supabase
      .from('items')
      .update({ attributes: newAttributes })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(rowToItem(data));
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

    const { error, count } = await supabase
      .from('items')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw error;
    if (count === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/items/bulk  (alias: /api/items/import)
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

    const { data: inserted, error } = await supabase
      .from('items')
      .insert(rows)
      .select('*');

    if (error) throw error;

    res.status(201).json({
      message: 'Bulk import successful',
      successCount: inserted?.length || 0,
      failCount: rows.length - (inserted?.length || 0),
    });
  } catch (err) {
    next(err);
  }
};

// Optional: CSV export used by the “Export” button
exports.exportItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }
    const { data, error } = await supabase
      .from('items')
      .select('id, client_id, attributes, last_updated')
      .eq('client_id', clientId)
      .order('id', { ascending: true });
    if (error) throw error;

    const rows = data || [];
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
        // naive CSV escape
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
