const pool = require('../db/pool');
const { computeLowState, deriveStockStatus } = require('./_stockLogic');

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

exports.listItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const result = await pool.query(
      `SELECT
         i.*,
         COALESCE(SUM(inv.quantity), 0)::numeric AS total_quantity,
         COUNT(inv.id)::int AS inventory_record_count,
         COALESCE(
           string_agg(DISTINCT loc.code, ', ' ORDER BY loc.code),
           ''
         ) AS inventory_location
       FROM items i
       LEFT JOIN inventory inv ON i.id = inv.item_id
       LEFT JOIN locations loc ON loc.id = inv.location_id
       WHERE i.client_id = $1
       GROUP BY i.id
       ORDER BY i.name ASC, i.part_number ASC, i.lot_number ASC, i.id ASC`,
      [clientId],
    );

    const items = result.rows.map((item) => {
      const quantity = Number(item.total_quantity);
      const totalQuantity = Number.isFinite(quantity) ? quantity : 0;
      const lowState = computeLowState(item, totalQuantity);

      return {
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
      };
    });

    return res.json(items);
  } catch (error) {
    return next(error);
  }
};

module.exports._test = { sanitizeDisplayAttributes };
