const supabase = require('../lib/supabaseClient')

// GET /api/items?client_id=123
exports.getAllItems = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10)
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'client_id is required' })
    }

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('client_id', clientId)
      .order('id', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
}

// GET /api/items/:id
exports.getItemById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' })
    }

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ message: 'Item not found' })
    res.json(data)
  } catch (err) {
    next(err)
  }
}

// POST /api/items
exports.createItem = async (req, res, next) => {
  try {
    const payload = {
      client_id:           parseInt(req.body.client_id, 10),
      name:                req.body.name,
      part_number:         req.body.part_number,
      description:         req.body.description || '',
      lot_number:          req.body.lot_number || '',
      quantity:            parseInt(req.body.quantity, 10) || 0,
      location:            req.body.location || '',
      last_updated:        new Date().toISOString(),
      low_stock_threshold: parseInt(req.body.low_stock_threshold, 10) || 0,
      alert_enabled:       !!req.body.alert_enabled
    }

    const { data, error } = await supabase
      .from('items')
      .insert(payload)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

// PUT /api/items/:id
exports.updateItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid item id' })
    }

    const updates = {
      name:                req.body.name,
      part_number:         req.body.part_number,
      description:         req.body.description || '',
      lot_number:          req.body.lot_number || '',
      quantity:            parseInt(req.body.quantity, 10) || 0,
      location:            req.body.location || '',
      last_updated:        new Date().toISOString(),
      low_stock_threshold: parseInt(req.body.low_stock_threshold, 10) || 0,
      alert_enabled:       !!req.body.alert_enabled
    }

    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ message: 'Item not found' })
    res.json(data)
  } catch (err) {
    next(err)
  }
}

// GET /api/items/alerts?client_id=123
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = req.query.client_id
      ? parseInt(req.query.client_id, 10)
      : null

    let builder = supabase
      .from('stock_alerts')
      .select(`
        id,
        triggered_at,
        items (
          id,
          client_id,
          name,
          quantity,
          low_stock_threshold
        )
      `)

    if (clientId) {
      builder = builder.eq('items.client_id', clientId)
    }

    const { data, error } = await builder
    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
}

// POST /api/items/alerts/:itemId/acknowledge
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.itemId, 10)
    if (isNaN(itemId)) {
      return res.status(400).json({ message: 'Invalid item id' })
    }

    const { error } = await supabase
      .from('stock_alerts')
      .delete()
      .eq('item_id', itemId)

    if (error) throw error
    res.json({ message: 'Alert acknowledged' })
  } catch (err) {
    next(err)
  }
}
