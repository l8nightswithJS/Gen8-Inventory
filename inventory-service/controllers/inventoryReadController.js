const pool = require('../db/pool');
const { computeLowState } = require('./_stockLogic');
const {
  applyProfileToItem,
  loadClientSettings,
} = require('./_profileSettings');

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
    const [settings, result] = await Promise.all([
      loadClientSettings(clientId),
      pool.query(
        `SELECT
           item.*,
           COALESCE(SUM(inventory.quantity), 0)::numeric AS total_quantity,
           COUNT(inventory.id)::int AS inventory_record_count,
           COALESCE(
             string_agg(DISTINCT location.code, ', ' ORDER BY location.code),
             ''
           ) AS inventory_location
         FROM items AS item
         LEFT JOIN inventory ON item.id = inventory.item_id
         LEFT JOIN locations AS location ON location.id = inventory.location_id
         WHERE item.client_id = $1
         GROUP BY item.id
         ORDER BY item.name ASC, item.part_number ASC, item.lot_number ASC, item.id ASC`,
        [clientId],
      ),
    ]);

    const items = result.rows.map((rawItem) => {
      const attributes = sanitizeDisplayAttributes(rawItem.attributes);
      const item = { ...rawItem, attributes };
      const quantity = Number(rawItem.total_quantity);
      const totalQuantity = Number.isFinite(quantity) ? quantity : 0;
      const lowState = computeLowState(item, totalQuantity);
      const profiled = applyProfileToItem(item, totalQuantity, settings);

      return {
        ...profiled,
        reorder_level:
          item.reorder_level == null ? null : Number(item.reorder_level),
        low_stock_threshold:
          item.low_stock_threshold == null
            ? null
            : Number(item.low_stock_threshold),
        threshold_configured: lowState.thresholdConfigured,
        inventory_profile: settings.profile_key,
      };
    });

    return res.json({
      settings,
      items,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports._test = { sanitizeDisplayAttributes };
