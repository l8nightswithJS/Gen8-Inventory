// backend/controllers/inventoryController.js
const supabase = require('../lib/supabaseClient');
const {
  computeLowState,
  cleanAttributes,
  normalizeKey,
} = require('./_stockLogic');

// ---- Helpers ----
function rowToItem(row) {
  return {
    id: row.id,
    client_id: row.client_id,
    attributes: row.attributes || {},
    created_at: row.created_at || null,
    updated_at: row.updated_at || row.last_updated || null,
  };
}

// ---- Alerts ----
// GET /api/items/alerts?client_id=123
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10);
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const { data: items, error } = await supabase
      .from('items')
      .select('id, client_id, attributes, updated_at, last_updated')
      .eq('client_id', clientId);

    if (error) throw error;

    const alerts = (items || []).flatMap((row) => {
      const attrs = row.attributes || {};
      const { low, reason, threshold, qty } = computeLowState(attrs);
      if (!low) return [];
      return [
        {
          id: `${row.id}:${row.updated_at || row.last_updated || ''}`,
          triggered_at:
            row.updated_at || row.last_updated || new Date().toISOString(),
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

// ---- Items CRUD ----
// GET /api/items?client_id=123
exports.listItems = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10);
    if (isNaN(clientId))
      return res.status(400).json({ message: 'client_id is required' });

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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

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

// POST /api/items  { client_id, attributes }
exports.createItem = async (req, res, next) => {
  try {
    const { client_id, attributes } = req.body;
    const clientId = parseInt(client_id, 10);
    if (isNaN(clientId))
      return res.status(400).json({ message: 'client_id is required' });
    if (!attributes || typeof attributes !== 'object') {
      return res.status(400).json({ message: 'attributes object is required' });
    }

    const cleaned = cleanAttributes(attributes);

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

// PUT /api/items/:id?merge=true   { attributes }
exports.updateItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const merge = String(req.query.merge || '').toLowerCase() === 'true';
    const { attributes } = req.body || {};
    if (!attributes || typeof attributes !== 'object') {
      return res.status(400).json({ message: 'attributes object is required' });
    }
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
    }

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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

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
// Body: { client_id, items: Array<object | {attributes: object}> }
exports.bulkImportItems = async (req, res, next) => {
  try {
    const clientId = parseInt(req.body.client_id, 10);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (isNaN(clientId))
      return res.status(400).json({ message: 'client_id is required' });
    if (items.length === 0)
      return res
        .status(400)
        .json({ message: 'items must be a non-empty array' });

    const rows = items
      .map((row) => (row && row.attributes ? row.attributes : row))
      .filter((obj) => obj && typeof obj === 'object')
      .map((obj) => ({
        client_id: clientId,
        attributes: cleanAttributes(obj),
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
