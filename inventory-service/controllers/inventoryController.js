const pool = require('../db/pool');
const { computeLowState, CORE_FIELDS, deriveStockStatus } = require('./_stockLogic');
const {
  ItemContractError,
  normalizeCreateItemPayload,
  normalizeUpdateItemPayload,
} = require('./_itemContract');

const LEGACY_OPERATIONAL_ATTRIBUTE_KEYS = new Set([
  'location',
  'locations',
  'inventory_location',
  'on_hand',
  'on_hand_review',
  'quantity',
  'total_quantity',
]);

function normalizeAttributeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

function sanitizeDisplayAttributes(attributes) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return {};
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (!LEGACY_OPERATIONAL_ATTRIBUTE_KEYS.has(normalizeAttributeKey(key))) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function sendContractError(error, res) {
  if (!(error instanceof ItemContractError)) return false;
  res.status(error.status || 400).json({ message: error.message });
  return true;
}

function sendUniqueItemConflict(error, res, action = 'Save') {
  if (error?.code !== '23505') return false;

  const rawConstraint = String(error.constraint || 'unknown_unique_constraint');
  const constraint = /^[a-z0-9_]+$/i.test(rawConstraint)
    ? rawConstraint
    : 'unknown_unique_constraint';
  const normalizedConstraint = constraint.toLowerCase();

  let message = `${action} failed because another record already uses a value that must be unique.`;
  if (normalizedConstraint.includes('barcode')) {
    message = `${action} failed. The internal inventory barcode is already assigned to another record.`;
  } else if (normalizedConstraint === 'items_pkey') {
    message = `${action} failed because the automatic item ID sequence is out of sync.`;
  } else if (normalizedConstraint.includes('part_lot')) {
    message = `${action} failed because the live database still has a unique part/lot restriction.`;
  }

  res.status(409).json({
    code: 'UNIQUE_CONFLICT',
    constraint,
    message,
  });
  return true;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

// GET /api/items/export?client_id=123
exports.exportItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const result = await pool.query(
      `SELECT
         i.*,
         COALESCE(SUM(inv.quantity), 0)::numeric AS total_quantity,
         COALESCE(
           string_agg(DISTINCT loc.code, ', ' ORDER BY loc.code),
           ''
         ) AS inventory_location
       FROM items i
       LEFT JOIN inventory inv ON inv.item_id = i.id
       LEFT JOIN locations loc ON loc.id = inv.location_id
       WHERE i.client_id = $1
       GROUP BY i.id
       ORDER BY i.name ASC, i.part_number ASC, i.lot_number ASC, i.id ASC`,
      [clientId],
    );

    const items = result.rows;
    if (items.length === 0) {
      return res.status(200).send('No items found for this client.');
    }

    const coreHeaders = [
      ...Array.from(CORE_FIELDS).filter(
        (field) => field !== 'alert_acknowledged_at',
      ),
      'inventory_location',
      'total_quantity',
      'review_status',
    ];

    const customKeys = new Set();
    for (const item of items) {
      const attributes = sanitizeDisplayAttributes(item.attributes);
      Object.keys(attributes).forEach((key) => customKeys.add(key));
    }

    const customHeaders = Array.from(customKeys).sort();
    const headers = [...coreHeaders, ...customHeaders];
    const csvRows = [headers.map(csvCell).join(',')];

    for (const item of items) {
      const attributes = sanitizeDisplayAttributes(item.attributes);
      const coreRow = coreHeaders.map((header) => item[header] ?? '');
      const customRow = customHeaders.map((header) => attributes[header] ?? '');
      csvRows.push([...coreRow, ...customRow].map(csvCell).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="export_${clientId}_${
        new Date().toISOString().split('T')[0]
      }.csv"`,
    );
    return res.send(csvRows.join('\n'));
  } catch (error) {
    return next(error);
  }
};

// GET /api/inventory/by-location
exports.getMasterInventoryByLocation = async (_req, res, next) => {
  try {
    const result = await pool.query(`
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
              'uom', i.uom,
              'review_status', i.review_status,
              'client_id', c.id,
              'client_name', c.name,
              'quantity', inv.quantity
            )
            ORDER BY i.part_number, i.lot_number, i.id
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM locations l
      LEFT JOIN inventory inv ON l.id = inv.location_id
      LEFT JOIN items i ON inv.item_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      GROUP BY l.id, l.code, l.description
      ORDER BY l.code;
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching master inventory:', error);
    return next(error);
  }
};

// GET /api/items/alerts?client_id=123
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const result = await pool.query(
      `SELECT i.*, COALESCE(SUM(inv.quantity), 0)::numeric AS total_quantity
       FROM items i
       LEFT JOIN inventory inv ON i.id = inv.item_id
       WHERE i.client_id = $1 AND i.alert_acknowledged_at IS NULL
       GROUP BY i.id`,
      [clientId],
    );

    const alerts = result.rows.flatMap((item) => {
      if (item.review_status === 'needs_review') return [];

      const totalQuantity = Number(item.total_quantity);
      const { low, reason, threshold, qty } = computeLowState(
        item,
        totalQuantity,
      );
      if (!low) return [];

      return [
        {
          item: {
            ...item,
            attributes: sanitizeDisplayAttributes(item.attributes),
            total_quantity: totalQuantity,
          },
          reason,
          threshold,
          qty,
        },
      ];
    });

    return res.json(alerts);
  } catch (error) {
    return next(error);
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
  } catch (error) {
    return next(error);
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

    const result = await pool.query(
      `INSERT INTO items (${columns.map(quoteIdentifier).join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values,
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (sendContractError(error, res)) return;
    if (sendUniqueItemConflict(error, res, 'Save')) return;
    return next(error);
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
         COALESCE(SUM(inv.quantity), 0)::numeric AS total_quantity
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
      Number(currentItem.total_quantity),
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

    if (!low) assignments.push('alert_acknowledged_at = NULL');
    assignments.push('last_updated = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE items
       SET ${assignments.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    );

    return res.json(result.rows[0]);
  } catch (error) {
    if (sendContractError(error, res)) return;
    if (sendUniqueItemConflict(error, res, 'Update')) return;
    return next(error);
  }
};

// GET /api/items/:id
exports.getItemById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const itemResult = await pool.query(
      `SELECT
         i.*,
         COALESCE(
           json_agg(
             json_build_object(
               'location_id', inv.location_id,
               'location_code', loc.code,
               'quantity', inv.quantity
             )
             ORDER BY loc.code
           ) FILTER (WHERE inv.id IS NOT NULL),
           '[]'::json
         ) AS inventory_levels,
         COALESCE(SUM(inv.quantity), 0)::numeric AS total_quantity
       FROM items i
       LEFT JOIN inventory inv ON inv.item_id = i.id
       LEFT JOIN locations loc ON loc.id = inv.location_id
       WHERE i.id = $1
       GROUP BY i.id`,
      [id],
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = itemResult.rows[0];
    const totalQuantity = Number(item.total_quantity);
    const lowState = computeLowState(item, totalQuantity);

    return res.json({
      ...item,
      attributes: sanitizeDisplayAttributes(item.attributes),
      total_quantity: totalQuantity,
      reorder_level:
        item.reorder_level == null ? null : Number(item.reorder_level),
      low_stock_threshold:
        item.low_stock_threshold == null
          ? null
          : Number(item.low_stock_threshold),
      threshold_configured: lowState.thresholdConfigured,
      status: deriveStockStatus(item, totalQuantity),
      inventory_levels: (item.inventory_levels || []).map((level) => ({
        ...level,
        quantity: Number(level.quantity),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      'DELETE FROM items WHERE id = $1 RETURNING id',
      [id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Item not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
