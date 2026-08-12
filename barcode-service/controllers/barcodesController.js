const pool = require('../db/pool');

function toRow(row) {
  return {
    id: row.id,
    client_id: row.client_id,
    item_id: row.item_id,
    barcode: row.barcode,
    symbology: row.symbology || null,
    created_at: row.created_at || null,
  };
}

exports.lookup = async (req, res, next) => {
  try {
    const code = String(req.query.code || '').trim();
    const clientId = Number(req.query.client_id);

    const mappingResult = await pool.query(
      `SELECT id, client_id, item_id, barcode, symbology, created_at
       FROM item_barcodes
       WHERE barcode = $1 AND client_id = $2
       LIMIT 1`,
      [code, clientId],
    );

    if (!mappingResult.rowCount) {
      return res.status(404).json({ message: 'Not found' });
    }

    const mapping = toRow(mappingResult.rows[0]);
    const itemResult = await pool.query(
      `SELECT id, client_id, attributes
       FROM items
       WHERE id = $1 AND client_id = $2 AND archived_at IS NULL
       LIMIT 1`,
      [mapping.item_id, clientId],
    );

    const item = itemResult.rows[0]
      ? {
          id: itemResult.rows[0].id,
          client_id: itemResult.rows[0].client_id,
          attributes: itemResult.rows[0].attributes || {},
        }
      : null;

    return res.json({ mapping, item });
  } catch (error) {
    return next(error);
  }
};

exports.listForItem = async (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    const clientId = Number(req.query.client_id);

    const itemResult = await pool.query(
      'SELECT 1 FROM items WHERE id = $1 AND client_id = $2 AND archived_at IS NULL LIMIT 1',
      [itemId, clientId],
    );
    if (!itemResult.rowCount) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const result = await pool.query(
      `SELECT id, client_id, item_id, barcode, symbology, created_at
       FROM item_barcodes
       WHERE item_id = $1 AND client_id = $2
       ORDER BY created_at ASC`,
      [itemId, clientId],
    );

    return res.json(result.rows.map(toRow));
  } catch (error) {
    return next(error);
  }
};

exports.assign = async (req, res, next) => {
  try {
    const clientId = Number(req.body.client_id);
    const itemId = Number(req.body.item_id);
    const barcode = String(req.body.barcode || '').trim();
    const symbology = req.body.symbology
      ? String(req.body.symbology).trim()
      : null;

    const itemResult = await pool.query(
      'SELECT 1 FROM items WHERE id = $1 AND client_id = $2 AND archived_at IS NULL LIMIT 1',
      [itemId, clientId],
    );
    if (!itemResult.rowCount) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const exists = await pool.query(
      'SELECT 1 FROM item_barcodes WHERE barcode = $1 LIMIT 1',
      [barcode],
    );
    if (exists.rowCount) {
      return res.status(409).json({ message: 'Barcode already assigned' });
    }

    const result = await pool.query(
      `INSERT INTO item_barcodes (client_id, item_id, barcode, symbology)
       VALUES ($1, $2, $3, $4)
       RETURNING id, client_id, item_id, barcode, symbology, created_at`,
      [clientId, itemId, barcode, symbology],
    );

    return res.status(201).json(toRow(result.rows[0]));
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Barcode already assigned' });
    }
    return next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      'DELETE FROM item_barcodes WHERE id = $1 RETURNING id',
      [id],
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Not found' });
    }

    return res.json({ message: 'Deleted' });
  } catch (error) {
    return next(error);
  }
};
