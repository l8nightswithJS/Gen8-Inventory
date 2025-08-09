// controllers/inventoryController.js
const supabase = require('../lib/supabaseClient');

// ──────────────── Helpers ──────────────── //

const BAD_STRING = new Set(['undefined', 'null', 'nan']);

/** snake_case keys, keep a–z0–9_ only */
function normalizeKey(key) {
  if (key == null) return null;
  return key
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

/** ensure attributes is a plain object of scalars we accept */
function cleanAttributes(attrs = {}) {
  if (attrs == null || Array.isArray(attrs) || typeof attrs !== 'object')
    return {};
  const out = {};
  for (const [rawKey, rawVal] of Object.entries(attrs)) {
    const key = normalizeKey(rawKey);
    if (!key || key === 'undefined' || key === 'null') continue;

    let v = rawVal;
    if (typeof v === 'string') {
      v = v.trim();
      if (BAD_STRING.has(v.toLowerCase())) continue;
    }
    if (v === '' || v === undefined || v === null) continue;

    // Only allow scalar JSON types
    if (['string', 'number', 'boolean'].includes(typeof v)) {
      out[key] = v;
    } else {
      // ignore arrays/objects to keep schema simple (can relax later)
      continue;
    }
  }
  delete out.undefined;
  delete out.null;
  return out;
}

function nowISO() {
  return new Date().toISOString();
}

/** coerce potential numeric string to number; returns null if not finite */
function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** read common alert-related fields from attributes with fallbacks */
function readAlertFields(attributes = {}) {
  const qty =
    numOrNull(attributes.quantity) ??
    numOrNull(attributes.qty_in_stock) ??
    null;
  const thresh =
    numOrNull(attributes.low_stock_threshold) ??
    numOrNull(attributes.reorder_point) ??
    null;
  const enabledRaw =
    attributes.alert_enabled ?? attributes.alerts_enabled ?? true;
  const enabled =
    typeof enabledRaw === 'boolean'
      ? enabledRaw
      : String(enabledRaw).toLowerCase() !== 'false';
  return { qty, thresh, enabled };
}

// ──────────────── Routes ──────────────── //

// GET /api/items?client_id=123
exports.getAllItems = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10);
    if (isNaN(clientId))
      return res.status(400).json({ message: 'client_id is required' });

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('client_id', clientId)
      .order('id', { ascending: false });

    if (error) throw error;
    res.json(data || []);
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
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Item not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// POST /api/items
// Body: { client_id, attributes: {...} }
exports.createItem = async (req, res, next) => {
  try {
    const client_id = parseInt(req.body.client_id, 10);
    if (isNaN(client_id))
      return res.status(400).json({ message: 'Invalid client_id' });

    const attributes = cleanAttributes(req.body.attributes);
    const insert = { client_id, attributes, last_updated: nowISO() };

    const { data, error } = await supabase
      .from('items')
      .insert(insert)
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// PUT /api/items/:id
// Body: { attributes: {...}, merge?: boolean } ; also supports ?merge=true
exports.updateItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid item id' });

    const incoming = cleanAttributes(req.body.attributes);
    const merge =
      req.query.merge === true ||
      req.query.merge === 'true' ||
      req.body.merge === true;

    let nextAttributes = incoming;

    if (merge) {
      const { data: existing, error: getErr } = await supabase
        .from('items')
        .select('attributes')
        .eq('id', id)
        .maybeSingle();
      if (getErr) throw getErr;
      if (!existing) return res.status(404).json({ message: 'Item not found' });
      nextAttributes = { ...(existing.attributes || {}), ...incoming };
    }

    const updates = { attributes: nextAttributes, last_updated: nowISO() };

    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

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
// Compute alerts dynamically from attributes
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = parseInt(req.query.client_id, 10);
    if (isNaN(clientId))
      return res.status(400).json({ message: 'client_id is required' });

    const { data: items, error } = await supabase
      .from('items')
      .select('id, client_id, attributes, last_updated')
      .eq('client_id', clientId);

    if (error) throw error;

    const alerts = (items || []).flatMap((item) => {
      const attrs = item.attributes || {};
      const { qty, thresh, enabled } = readAlertFields(attrs);
      if (enabled && qty != null && thresh != null && qty <= thresh) {
        return [
          {
            id: `${item.id}:${item.last_updated || ''}`, // computed key
            triggered_at: item.last_updated || nowISO(),
            item: {
              id: item.id,
              client_id: item.client_id,
              attributes: attrs,
              last_updated: item.last_updated,
            },
          },
        ];
      }
      return [];
    });

    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

// POST /api/items/alerts/:alertId/acknowledge
// No‑op when alerts are computed — keep endpoint for compatibility
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    return res.json({
      acknowledged: true,
      note: 'Alerts are computed; nothing to persist.',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/items/bulk
// Body: { client_id, items: [ {...} or {attributes:{...}} , ... ] }
exports.bulkImportItems = async (req, res, next) => {
  try {
    const client_id = parseInt(req.body.client_id, 10);
    const itemsIn = req.body.items;
    if (isNaN(client_id) || !Array.isArray(itemsIn)) {
      return res
        .status(400)
        .json({ message: 'Missing client_id or items array' });
    }

    const rows = itemsIn.map((row) => {
      const rawAttrs =
        row && typeof row === 'object' && !Array.isArray(row)
          ? row.attributes && typeof row.attributes === 'object'
            ? row.attributes
            : row
          : {};
      const attributes = cleanAttributes(rawAttrs);
      return { client_id, attributes, last_updated: nowISO() };
    });

    if (rows.length === 0) {
      return res.status(400).json({ message: 'No valid rows to import' });
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
