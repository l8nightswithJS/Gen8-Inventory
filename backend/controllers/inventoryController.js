// controllers/inventoryController.js
const supabase = require('../lib/supabaseClient')  // adjust path as needed

// … existing getAllItems, getItemById …

// POST /api/items
exports.createItem = async (req, res, next) => {
  try {
    const payload = {
      client_id:            parseInt(req.body.client_id, 10),
      name:                 req.body.name,
      part_number:          req.body.part_number,
      description:          req.body.description || '',
      lot_number:           req.body.lot_number || '',
      quantity:             parseInt(req.body.quantity, 10) || 0,
      location:             req.body.location || '',
      last_updated:         new Date().toISOString(),

      // ← new fields
      low_stock_threshold:  parseInt(req.body.low_stock_threshold, 10) || 0,
      alert_enabled:        !!req.body.alert_enabled,
    };

    const { data: item, error } = await supabase
      .from('items')
      .insert(payload)
      .single();

    if (error) throw error;
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// PUT /api/items/:id
exports.updateItem = async (req, res, next) => {
  try {
    const updates = {
      name:                 req.body.name,
      part_number:          req.body.part_number,
      description:          req.body.description || '',
      lot_number:           req.body.lot_number || '',
      quantity:             parseInt(req.body.quantity, 10) || 0,
      location:             req.body.location || '',
      last_updated:         new Date().toISOString(),

      // ← new fields
      low_stock_threshold:  parseInt(req.body.low_stock_threshold, 10) || 0,
      alert_enabled:        !!req.body.alert_enabled,
    };

    const { data: item, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// NEW: GET /api/alerts?client_id=...
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10);
    if (!clientId) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    // join stock_alerts → items to get current quantity & threshold
    const { data, error } = await supabase
      .from('stock_alerts')
      .select(`
        id,
        triggered_at,
        items (
          id, client_id, name, quantity, low_stock_threshold
        )
      `)
      .eq('items.client_id', clientId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// NEW: POST /api/alerts/:itemId/acknowledge
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (!itemId) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

    const { error } = await supabase
      .from('stock_alerts')
      .delete()
      .eq('item_id', itemId);

    if (error) throw error;
    res.json({ message: 'Alert acknowledged' });
  } catch (err) {
    next(err);
  }
};
