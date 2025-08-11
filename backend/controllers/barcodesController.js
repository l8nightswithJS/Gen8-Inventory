// backend/controllers/barcodesController.js
const supabase = require('../lib/supabaseClient');

function toRow(r) {
  return {
    id: r.id,
    client_id: r.client_id,
    item_id: r.item_id,
    barcode: r.barcode,
    symbology: r.symbology || null,
    created_at: r.created_at || null,
  };
}

/**
 * GET /api/barcodes/lookup?code=XXX&client_id=123
 * Finds the item for a scanned barcode. Client scoping is optional;
 * if provided, we require it to match.
 */
exports.lookup = async (req, res, next) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) return res.status(400).json({ message: 'code is required' });

    const clientId = req.query.client_id
      ? parseInt(req.query.client_id, 10)
      : null;

    let q = supabase
      .from('item_barcodes')
      .select('id, client_id, item_id, barcode, symbology, created_at')
      .eq('barcode', code)
      .limit(1);

    if (!isNaN(clientId)) q = q.eq('client_id', clientId);

    const { data: rows, error } = await q;
    if (error) throw error;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    // Optionally include the item’s attributes for convenience
    const { data: item, error: itemErr } = await supabase
      .from('items')
      .select('id, client_id, attributes')
      .eq('id', rows[0].item_id)
      .single();
    if (itemErr) throw itemErr;

    return res.json({
      mapping: toRow(rows[0]),
      item: item
        ? {
            id: item.id,
            client_id: item.client_id,
            attributes: item.attributes || {},
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/items/:id/barcodes
 */
exports.listForItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId))
      return res.status(400).json({ message: 'Invalid item id' });

    const { data, error } = await supabase
      .from('item_barcodes')
      .select('id, client_id, item_id, barcode, symbology, created_at')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json((data || []).map(toRow));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/barcodes
 * Body: { client_id, item_id, barcode, symbology? }
 * - Ensures barcode is globally unique.
 */
exports.assign = async (req, res, next) => {
  try {
    const clientId = parseInt(req.body.client_id, 10);
    const itemId = parseInt(req.body.item_id, 10);
    const barcode = String(req.body.barcode || '').trim();
    const symbology = req.body.symbology
      ? String(req.body.symbology).trim()
      : null;

    if (isNaN(clientId) || isNaN(itemId) || !barcode) {
      return res
        .status(400)
        .json({ message: 'client_id, item_id and barcode are required' });
    }

    // Reject duplicates (global uniqueness)
    const { data: exists, error: exErr } = await supabase
      .from('item_barcodes')
      .select('id, item_id, client_id')
      .eq('barcode', barcode)
      .maybeSingle();
    if (exErr) throw exErr;
    if (exists) {
      return res.status(409).json({
        message: 'Barcode already assigned',
        existing: {
          id: exists.id,
          item_id: exists.item_id,
          client_id: exists.client_id,
        },
      });
    }

    const { data, error } = await supabase
      .from('item_barcodes')
      .insert([{ client_id: clientId, item_id: itemId, barcode, symbology }])
      .select('id, client_id, item_id, barcode, symbology, created_at')
      .single();
    if (error) throw error;

    res.status(201).json(toRow(data));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/barcodes/:id
 */
exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const { error, count } = await supabase
      .from('item_barcodes')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw error;
    if (!count) return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
