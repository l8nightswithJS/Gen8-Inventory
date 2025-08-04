// controllers/inventoryController.js
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
      name: req.body.name,
      part_number: req.body.part_number,
      description: req.body.description || '',
      lot_number: req.body.lot_number || '',
      quantity: parseInt(req.body.quantity, 10) || 0,
      location: req.body.location || '',
      last_updated: new Date().toISOString(),
      low_stock_threshold: parseInt(req.body.low_stock_threshold, 10) || 0,
      alert_enabled: !!req.body.alert_enabled,
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
  console.log('>>>> updateItem invoked for id', req.params.id);
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

    const updates = {
      name: req.body.name,
      part_number: req.body.part_number,
      description: req.body.description || '',
      lot_number: req.body.lot_number || '',
      quantity: parseInt(req.body.quantity, 10) || 0,
      location: req.body.location || '',
      last_updated: new Date().toISOString(),
      low_stock_threshold: parseInt(req.body.low_stock_threshold, 10) || 0,
      alert_enabled: !!req.body.alert_enabled,
      has_lot: !!req.body.has_lot,
    };

    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    console.log('>>>> supabase.update returned', { data, error });

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
          name,
          quantity,
          low_stock_threshold
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

    const rows = items
      .filter((item) => item.name && item.part_number)
      .map((item) => ({
        client_id,
        name: item.name,
        part_number: item.part_number,
        description: item.description || '',
        lot_number: item.lot_number || '',
        quantity: parseInt(item.quantity, 10) || 0,
        location: item.location || '',
        last_updated: new Date().toISOString(),
        low_stock_threshold: parseInt(item.low_stock_threshold, 10) || 0,
        alert_enabled: !!item.alert_enabled,
        has_lot: !!item.has_lot,
      }));

    if (rows.length === 0) {
      return res.status(400).json({ message: 'No valid items to import' });
    }

    const { data, error } = await supabase.from('items').insert(rows);

    if (error) throw error;

    res
      .status(201)
      .json({ message: 'Bulk import successful', count: data.length });
  } catch (err) {
    next(err);
  }
};
