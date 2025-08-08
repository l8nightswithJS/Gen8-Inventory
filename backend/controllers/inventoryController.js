// controllers/inventoryController.js
const supabase = require('../lib/supabaseClient');

/**
 * GET /api/items?client_id=123
 */
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

/**
 * GET /api/items/:id
 */
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

/**
 * POST /api/items
 * Body: { client_id: number, attributes: object }
 */
exports.createItem = async (req, res, next) => {
  try {
    const client_id = parseInt(req.body.client_id, 10);
    if (isNaN(client_id)) {
      return res.status(400).json({ message: 'Invalid client_id' });
    }
    if (
      typeof req.body.attributes !== 'object' ||
      Array.isArray(req.body.attributes)
    ) {
      return res.status(400).json({ message: 'attributes must be an object' });
    }

    const payload = {
      client_id,
      attributes: req.body.attributes,
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

/**
 * PUT /api/items/:id
 * Body: { attributes: object }
 */
exports.updateItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }
    if (
      typeof req.body.attributes !== 'object' ||
      Array.isArray(req.body.attributes)
    ) {
      return res.status(400).json({ message: 'attributes must be an object' });
    }

    const updates = {
      attributes: req.body.attributes,
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

/**
 * DELETE /api/items/:id
 */
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

/**
 * GET /api/items/alerts?client_id=123
 */
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

/**
 * POST /api/items/alerts/:alertId/acknowledge
 */
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

/**
 * POST /api/items/bulk
 * Body: { client_id: number, items: Array<{ attributes: object }> }
 */
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
      if (typeof i.attributes !== 'object' || Array.isArray(i.attributes)) {
        throw new Error('Each item must have an attributes object');
      }
      return {
        client_id,
        attributes: i.attributes,
        last_updated: new Date().toISOString(),
      };
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
