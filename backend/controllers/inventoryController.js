const supabase = require('../lib/supabaseClient');

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
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

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
    const payload = {
      client_id: parseInt(req.body.client_id, 10),
      attributes: req.body.attributes || {},
      last_updated: new Date().toISOString(),
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
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

    const updates = {
      attributes: req.body.attributes || {},
      last_updated: new Date().toISOString(),
    };

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
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

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
    const { client_id, items } = req.body;

    if (!client_id || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Missing client_id or items' });
    }

    const validItems = items.filter((item) => {
      return (
        typeof item.attributes === 'object' &&
        Object.values(item.attributes).some(
          (val) => val && typeof val === 'string',
        )
      );
    });

    const rows = validItems.map((item) => ({
      client_id,
      attributes: item.attributes || {},
      last_updated: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      return res.status(400).json({ message: 'No valid items to import' });
    }

    const { data, error } = await supabase.from('items').insert(rows);

    if (error) throw error;

    res.status(201).json({
      message: 'Bulk import successful',
      successCount: data.length,
      failCount: items.length - data.length,
    });
  } catch (err) {
    next(err);
  }
};
