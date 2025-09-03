// barcode-service/controllers/barcodesController.js
const pool = require('../db/pool');

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
 * Finds the item for a scanned barcode.
 */
exports.lookup = async (req, res, next) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) return res.status(400).json({ message: 'code is required' });

    const clientId = req.query.client_id
      ? parseInt(req.query.client_id, 10)
      : null;

    let query =
      'SELECT id, client_id, item_id, barcode, symbology, created_at FROM item_barcodes WHERE barcode = $1';
    const params = [code];
    if (!isNaN(clientId)) {
      query += ' AND client_id = $2';
      params.push(clientId);
    }
    query += ' LIMIT 1';

    const rows = await pool.query(query, params);

    if (rows.rowCount === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    const mapping = toRow(rows.rows[0]);

    // Fetch item details
    const itemRes = await pool.query(
      'SELECT id, client_id, attributes FROM items WHERE id = $1',
      [mapping.item_id],
    );

    const item =
      itemRes.rowCount > 0
        ? {
            id: itemRes.rows[0].id,
            client_id: itemRes.rows[0].client_id,
            attributes: itemRes.rows[0].attributes || {},
          }
        : null;

    return res.json({ mapping, item });
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

    const result = await pool.query(
      'SELECT id, client_id, item_id, barcode, symbology, created_at FROM item_barcodes WHERE item_id = $1 ORDER BY created_at ASC',
      [itemId],
    );

    res.json(result.rows.map(toRow));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/barcodes
 * Ensures barcode is globally unique.
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

    // Check uniqueness
    const exists = await pool.query(
      'SELECT id, item_id, client_id FROM item_barcodes WHERE barcode = $1 LIMIT 1',
      [barcode],
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({
        message: 'Barcode already assigned',
        existing: {
          id: exists.rows[0].id,
          item_id: exists.rows[0].item_id,
          client_id: exists.rows[0].client_id,
        },
      });
    }

    const result = await pool.query(
      'INSERT INTO item_barcodes (client_id, item_id, barcode, symbology) VALUES ($1, $2, $3, $4) RETURNING id, client_id, item_id, barcode, symbology, created_at',
      [clientId, itemId, barcode, symbology],
    );

    res.status(201).json(toRow(result.rows[0]));
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

    const result = await pool.query(
      'DELETE FROM item_barcodes WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
