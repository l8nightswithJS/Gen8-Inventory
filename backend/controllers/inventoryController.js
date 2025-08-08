const supabase = require('../lib/supabaseClient');

// Normalize a single key to snake_case
function normalizeKey(key) {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

// Normalize an attributes object
function normalizeAttributes(attributes = {}) {
  const out = {};
  for (const [rawKey, rawVal] of Object.entries(attributes)) {
    const key = normalizeKey(rawKey);
    out[key] = rawVal;
  }
  return out;
}

// Merge normalized attrs into flat columns + JSONB rest
function buildItemPayload(attrsIn) {
  const attrs = normalizeAttributes(attrsIn);
  const { quantity, low_stock_threshold, alert_enabled, ...restAttrs } = attrs;

  const payload = {
    attributes: restAttrs,
    last_updated: new Date().toISOString(),
  };
  if (quantity != null) {
    payload.quantity = parseInt(quantity, 10) || 0;
  }
  if (low_stock_threshold != null) {
    payload.low_stock_threshold = parseInt(low_stock_threshold, 10);
  }
  if (alert_enabled != null) {
    payload.alert_enabled = !!alert_enabled;
  }
  return payload;
}

// GET /api/items?client_id=123
exports.getAllItems = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10);
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('client_id', clientId)
      .order('id', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET /api/items/:id
exports.getItemById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid item id' });

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Item not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// POST /api/items
exports.createItem = async (req, res, next) => {
  try {
    const client_id = parseInt(req.body.client_id, 10);
    if (isNaN(client_id)) {
      return res.status(400).json({ message: 'Invalid client_id' });
    }

    const payload = {
      client_id,
      ...buildItemPayload(req.body.attributes),
    };

    const { data, error } = await supabase
      .from('items')
      .insert(payload)
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// PUT /api/items/:id
exports.updateItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid item id' });

    const updates = buildItemPayload(req.body.attributes);

    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Item not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid item id' });

    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/items/alerts?client_id=123
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10);
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const { data, error } = await supabase
      .from('stock_alerts')
      .select(
        `
        id,
        triggered_at,
        item:items (
          id,
          client_id,
          quantity,
          low_stock_threshold,
          alert_enabled,
          attributes,
          last_updated
        )
      `,
      )
      .eq('item.client_id', clientId);
    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// POST /api/items/alerts/:alertId/acknowledge
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const alertId = parseInt(req.params.alertId, 10);
    if (isNaN(alertId)) {
      return res.status(400).json({ message: 'Invalid alert id' });
    }
    const { error } = await supabase
      .from('stock_alerts')
      .delete()
      .eq('id', alertId);
    if (error) throw error;

    res.json({ message: 'Alert acknowledged' });
  } catch (err) {
    next(err);
  }
};

// POST /api/items/bulk
exports.bulkImportItems = async (req, res, next) => {
  try {
    const client_id = parseInt(req.body.client_id, 10);
    const itemsIn = req.body.items;
    if (isNaN(client_id) || !Array.isArray(itemsIn)) {
      return res
        .status(400)
        .json({ message: 'Missing client_id or items array' });
    }

    const rows = itemsIn.map((i) => {
      const { attributes } = i;
      const payload = {
        client_id,
        ...buildItemPayload(attributes),
      };
      return payload;
    });

    const { data, error } = await supabase.from('items').insert(rows);
    if (error) throw error;

    res.status(201).json({
      message: 'Bulk import successful',
      successCount: data.length,
      failCount: itemsIn.length - data.length,
    });
  } catch (err) {
    next(err);
  }
};
