const pool = require('../db/pool');
const format = require('pg-format');
const {
  calculateStockLevels,
  computeLowState,
  CORE_FIELDS,
  normalizeKey,
  REVERSE_ALIAS_MAP,
} = require('./_stockLogic');
const {
  ItemContractError,
  normalizeCreateItemPayload,
  normalizeUpdateItemPayload,
} = require('./_itemContract');

function sendContractError(err, res) {
  if (!(err instanceof ItemContractError)) return false;
  res.status(err.status || 400).json({ message: err.message });
  return true;
}

function sendUniqueItemConflict(err, res, action = 'Save') {
  if (err?.code !== '23505') return false;

  const constraint = String(err.constraint || '').toLowerCase();
  const barcodeConflict = constraint.includes('barcode');

  res.status(409).json({
    message: barcodeConflict
      ? `${action} failed. Each inventory record must have a unique barcode.`
      : `${action} failed because another record already uses a value that must be unique.`,
  });
  return true;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function separateItemData(body) {
  const { coreData, attributes } = normalizeUpdateItemPayload(body);
  return { coreData, attributes };
}

// POST /api/items/bulk
exports.bulkImportItems = async (req, res, next) => {
  try {
    const { client_id, items } = req.body;
    if (!client_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'client_id and a non-empty items array are required.',
      });
    }

    const processedRows = items.map((rawItem) => {
      const mappedItem = {};
      for (const rawKey in rawItem) {
        const normalized = normalizeKey(rawKey);
        const canonicalKey = REVERSE_ALIAS_MAP.get(normalized);
        const keyToUse = canonicalKey || rawKey;
        mappedItem[keyToUse] = rawItem[rawKey];
      }
      return mappedItem;
    });

    const finalRows = processedRows.map((item) => separateItemData(item));
    const coreColumns = Object.keys(finalRows[0].coreData);

    if (!coreColumns.includes('part_number')) {
      return res.status(400).json({
        message: 'Import failed. No mappable part_number column was found.',
      });
    }

    const values = finalRows.map((row) => {
      const rowValues = coreColumns.map((col) => row.coreData[col]);
      rowValues.push(row.attributes);
      rowValues.push(client_id);
      return rowValues;
    });

    const sql = format(
      'INSERT INTO items (%I, attributes, client_id) VALUES %L RETURNING id',
      coreColumns,
      values,
    );

    const result = await pool.query(sql);

    return res.status(201).json({
      message: 'Bulk import successful',
      successCount: result.rows.length,
    });
  } catch (err) {
    if (sendContractError(err, res)) return;
    if (sendUniqueItemConflict(err, res, 'Import')) return;
    console.error('Bulk import error:', err);
    return next(err);
  }
};

// GET /api/items/export?client_id=123
exports.exportItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const result = await pool.query(
      'SELECT * FROM items WHERE client_id = $1 ORDER BY name ASC',
      [clientId],
    );
    const items = result.rows;
    if (items.length === 0) {
      return res.status(200).send('No items found for this client.');
    }

    const coreHeaders = Array.from(CORE_FIELDS).filter(
      (field) => field !== 'alert_acknowledged_at',
    );
    const customKeys = new Set();
    items.forEach((item) => {
      if (item.attributes) {
        Object.keys(item.attributes).forEach((key) => customKeys.add(key));
      }
    });
    const customHeaders = Array.from(customKeys);
    const headers = [...coreHeaders, ...customHeaders];

    const csvRows = [headers.join(',')];
    for (const item of items) {
      const row = coreHeaders.map((header) => item[header] ?? '');
      const customRow = customHeaders.map(
        (header) => item.attributes?.[header] ?? '',
      );
      const fullRow = [...row, ...customRow].map(
        (val) => `"${String(val ?? '').replace(/"/g, '""')}"`,
      );
      csvRows.push(fullRow.join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="export_${clientId}_${
        new Date().toISOString().split('T')[0]
      }.csv"`,
    );
    return res.send(csvRows.join('\n'));
  } catch (err) {
    return next(err);
  }
};

// GET /api/inventory/by-location
exports.getMasterInventoryByLocation = async (_req, res, next) => {
  try {
    const query = `
      SELECT
        l.id AS location_id,
        l.code AS location_code,
        l.description AS location_description,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'item_id', i.id,
              'part_number', i.part_number,
              'lot_number', i.lot_number,
              'name', i.name,
              'item_description', i.description,
              'client_id', c.id,
              'client_name', c.name,
              'quantity', inv.quantity
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM locations l
      LEFT JOIN inventory inv ON l.id = inv.location_id
      LEFT JOIN items i ON inv.item_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      GROUP BY l.id, l.code, l.description
      ORDER BY l.code;
    `;

    const result = await pool.query(query);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching master inventory:', err);
    return next(err);
  }
};

// GET /api/items/alerts?client_id=123
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const result = await pool.query(
      `SELECT i.*, COALESCE(SUM(inv.quantity), 0)::int AS total_quantity
       FROM items i
       LEFT JOIN inventory inv ON i.id = inv.item_id
       WHERE i.client_id = $1 AND i.alert_acknowledged_at IS NULL
       GROUP BY i.id`,
      [clientId],
    );

    const alerts = result.rows.flatMap((item) => {
      const { low, reason, threshold, qty } = computeLowState(
        item,
        item.total_quantity,
      );
      if (!low) return [];
      return [{ item, reason, threshold, qty }];
    });
    return res.json(alerts);
  } catch (err) {
    return next(err);
  }
};

// POST /api/items/alerts/:id/acknowledge
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query(
      'UPDATE items SET alert_acknowledged_at = NOW() WHERE id = $1',
      [id],
    );
    return res.json({ message: 'Acknowledged' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/items
exports.createItem = async (req, res, next) => {
  try {
    const { clientId, coreData, attributes } = normalizeCreateItemPayload(
      req.body,
    );
    const columns = ['client_id', ...Object.keys(coreData), 'attributes'];
    const values = [clientId, ...Object.values(coreData), JSON.stringify(attributes)];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    placeholders[placeholders.length - 1] += '::jsonb';

    const query = `
      INSERT INTO items (${columns.map(quoteIdentifier).join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (sendContractError(err, res)) return;
    if (sendUniqueItemConflict(err, res, 'Save')) return;
    return next(err);
  }
};

// PUT /api/items/:id
exports.updateItem = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { coreData, attributes, attributesProvided } =
      normalizeUpdateItemPayload(req.body);

    if (Object.keys(coreData).length === 0 && !attributesProvided) {
      return res.status(400).json({ message: 'No item fields to update.' });
    }

    const currentResult = await pool.query(
      `SELECT
         i.reorder_level,
         i.low_stock_threshold,
         i.alert_enabled,
         i.alert_acknowledged_at,
         COALESCE(SUM(inv.quantity), 0)::int AS total_quantity
       FROM items i
       LEFT JOIN inventory inv ON inv.item_id = i.id
       WHERE i.id = $1
       GROUP BY i.id`,
      [id],
    );

    const currentItem = currentResult.rows[0];
    if (!currentItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const effectiveAlertState = {
      reorder_level: Object.prototype.hasOwnProperty.call(
        coreData,
        'reorder_level',
      )
        ? coreData.reorder_level
        : currentItem.reorder_level,
      low_stock_threshold: Object.prototype.hasOwnProperty.call(
        coreData,
        'low_stock_threshold',
      )
        ? coreData.low_stock_threshold
        : currentItem.low_stock_threshold,
      alert_enabled: Object.prototype.hasOwnProperty.call(
        coreData,
        'alert_enabled',
      )
        ? coreData.alert_enabled
        : currentItem.alert_enabled,
    };

    const { low } = computeLowState(
      effectiveAlertState,
      currentItem.total_quantity,
    );

    const assignments = [];
    const values = [];

    for (const [field, value] of Object.entries(coreData)) {
      values.push(value);
      assignments.push(`${quoteIdentifier(field)} = $${values.length}`);
    }

    if (attributesProvided) {
      values.push(JSON.stringify(attributes));
      assignments.push(`attributes = $${values.length}::jsonb`);
    }

    if (!low) {
      assignments.push('alert_acknowledged_at = NULL');
    }

    assignments.push('last_updated = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE items
       SET ${assignments.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    if (sendContractError(err, res)) return;
    if (sendUniqueItemConflict(err, res, 'Update')) return;
    return next(err);
  }
};

// GET /api/items?client_id=123
exports.listItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const result = await pool.query(
      `SELECT i.*, COALESCE(SUM(inv.quantity), 0)::int AS total_quantity
       FROM items i
       LEFT JOIN inventory inv ON i.id = inv.item_id
       WHERE i.client_id = $1
       GROUP BY i.id
       ORDER BY i.name ASC, i.part_number ASC, i.lot_number ASC, i.id ASC`,
      [clientId],
    );

    return res.json(calculateStockLevels(result.rows));
  } catch (err) {
    return next(err);
  }
};

// GET /api/items/:id
exports.getItemById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const itemResult = await pool.query(
      `SELECT i.*,
              (SELECT COALESCE(json_agg(json_build_object('location_id', inv.location_id, 'location_code', loc.code, 'quantity', inv.quantity)), '[]'::json)
               FROM inventory inv JOIN locations loc ON inv.location_id = loc.id
               WHERE inv.item_id = i.id) as inventory_levels
       FROM items i
       WHERE i.id = $1`,
      [id],
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    return res.json(itemResult.rows[0]);
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM items WHERE id = $1', [id]);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

// POST /api/adjust
exports.adjustInventory = async (req, res, next) => {
  try {
    const { item_id, location_id, change_quantity } = req.body;
    const result = await pool.query(
      `INSERT INTO inventory (item_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (item_id, location_id)
       DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
       RETURNING quantity`,
      [item_id, location_id, change_quantity],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Could not update inventory record.' });
    }
    return res.json({
      message: 'Inventory updated successfully',
      new_quantity: result.rows[0].quantity,
    });
  } catch (err) {
    if (err.code === '23514') {
      return res
        .status(409)
        .json({ message: 'Update failed: quantity cannot be negative.' });
    }
    return next(err);
  }
};
