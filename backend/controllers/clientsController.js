// controllers/clientsController.js
const fs       = require('fs')
const path     = require('path')
const supabase = require('../models/db')  // your service‑role Supabase client

// … your existing getAllClients, getClientById, createClient, updateClient, deleteClient …

/**
 * GET /api/clients/:id/alerts
 * Returns every low‑stock alert for all items under this client
 */
exports.getClientAlerts = async (req, res, next) => {
  const clientId = parseInt(req.params.id, 10)
  if (isNaN(clientId)) {
    return res.status(400).json({ message: 'Invalid client id' })
  }

  try {
    // 1) Fetch all items for this client
    const { data: items, error: itemErr } = await supabase
      .from('items')
      .select('id, name, quantity, low_stock_threshold')
      .eq('client_id', clientId)

    if (itemErr) throw itemErr
    if (!items.length) {
      return res.json({ alerts: [] })
    }

    // 2) Fetch all alerts for those items
    const itemIds = items.map(i => i.id)
    const { data: stockAlerts, error: alertErr } = await supabase
      .from('stock_alerts')
      .select('id, item_id, triggered_at')
      .in('item_id', itemIds)

    if (alertErr) throw alertErr

    // 3) Merge each alert with its parent item
    const alerts = stockAlerts.map(a => {
      const item = items.find(i => i.id === a.item_id)
      return {
        id:           a.id,
        triggered_at: a.triggered_at,
        item          // attaches { id, name, quantity, low_stock_threshold }
      }
    })

    res.json({ alerts })
  } catch (err) {
    next(err)
  }
}
