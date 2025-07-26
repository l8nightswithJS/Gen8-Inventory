// controllers/inventoryController.js
const supabase = require('../lib/supabaseClient')  // or '../models/db', whichever you use

// … your existing getAllItems, getItemById, createItem, updateItem …

/**
 * GET /api/items/alerts?client_id=123
 * Returns an array of alerts, each with its `item` data.
 */
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10)
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'client_id is required' })
    }

    // join stock_alerts → items, but alias the nested object as `item`
    const { data, error } = await supabase
      .from('stock_alerts')
      .select(`
        id,
        triggered_at,
        item:items (
          id,
          client_id,
          name,
          quantity,
          low_stock_threshold
        )
      `)
      .eq('item.client_id', clientId)

    if (error) throw error
    // data: [ { id, triggered_at, item: { … } }, … ]
    res.json(data)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/items/alerts/:alertId/acknowledge
 * Deletes exactly one alert by its `id`
 */
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const alertId = parseInt(req.params.alertId, 10)
    if (isNaN(alertId)) {
      return res.status(400).json({ message: 'Invalid alert id' })
    }

    const { error } = await supabase
      .from('stock_alerts')
      .delete()
      .eq('id', alertId)

    if (error) throw error
    res.json({ message: 'Alert acknowledged' })
  } catch (err) {
    next(err)
  }
}
