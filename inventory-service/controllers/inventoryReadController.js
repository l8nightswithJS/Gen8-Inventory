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

function firstValue(attributes, keys) {
  for (const key of keys) {
    const value = attributes?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function canonicalizeLegacyAttributes(attributes, profileKey) {
  const cleaned = sanitizeDisplayAttributes(attributes);
  if (profileKey !== 'resin') return cleaned;

  const canonical = {
    ...cleaned,
    label_name: firstValue(cleaned, ['label_name', 'Label Name']),
    manufacturer: firstValue(cleaned, ['manufacturer', 'MFG', 'Manufacturer']),
    material_type: firstValue(cleaned, ['material_type', 'Type']),
    color: firstValue(cleaned, ['color', 'Color']),
    additive: firstValue(cleaned, ['additive', 'Additive']),
    on_order: firstValue(cleaned, ['on_order', 'On Order']),
  };

  for (const key of [
    'Label Name',
    'MFG',
    'Manufacturer',
    'Type',
    'Color',
    'Additive',
    'On Order',
  ]) {
    delete canonical[key];
  }

  return Object.fromEntries(
    Object.entries(canonical).filter(([, value]) => value !== null && value !== ''),
  );
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
           ) AS inventory_location,
           COALESCE(
             jsonb_agg(
               DISTINCT jsonb_build_object(
                 'location_id', location.id,
                 'location_code', location.code,
                 'location_barcode', location.barcode,
                 'location_type', location.location_type,
                 'quantity', inventory.quantity
               )
             ) FILTER (WHERE inventory.id IS NOT NULL AND inventory.quantity > 0),
             '[]'::jsonb
           ) AS inventory_levels
         FROM items AS item
         LEFT JOIN inventory ON item.id = inventory.item_id
         LEFT JOIN locations AS location ON location.id = inventory.location_id
         WHERE item.client_id = $1
           AND item.archived_at IS NULL
         GROUP BY item.id
         ORDER BY item.name ASC, item.part_number ASC, item.lot_number ASC, item.id ASC`,
        [clientId],
      ),
    ]);

    const items = result.rows.map((rawItem) => {
      const attributes = canonicalizeLegacyAttributes(
        rawItem.attributes,
        settings.profile_key,
      );
      const item = { ...rawItem, attributes };
      const quantity = Number(rawItem.total_quantity);
      const totalQuantity = Number.isFinite(quantity) ? quantity : 0;
      const lowState = computeLowState(item, totalQuantity);
      const profiled = applyProfileToItem(item, totalQuantity, settings);

      return {
        ...profiled,
        initial_quantity:
          item.initial_quantity == null ? null : Number(item.initial_quantity),
        inventory_levels: (item.inventory_levels || []).map((level) => ({
          ...level,
          quantity: Number(level.quantity),
        })),
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

module.exports._test = {
  canonicalizeLegacyAttributes,
  sanitizeDisplayAttributes,
};
