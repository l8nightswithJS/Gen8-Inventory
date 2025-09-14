// inventory-service/controllers/_stockLogic.js (Final Intelligent Mapper Version)

const CORE_FIELDS = new Set([
  'part_number',
  'lot_number',
  'name',
  'description',
  'barcode',
  'reorder_level',
  'low_stock_threshold',
  'alert_enabled',
  'alert_acknowledged_at',
]);

// The Intelligent Alias Map
const ALIAS_MAP = {
  part_number: ['part', 'part_number', 'part #', 'part#', 'pn', 'p/n', 'sku'],
  lot_number: ['lot', 'lot_number', 'lot #', 'lot#', 'batch', 'batch_number'],
  description: ['desc', 'description', 'item_description'],
  reorder_level: ['reorder_level', 'reorder point', 'reorder_lvl', 'min_stock'],
  // Add any other aliases you can think of for your core fields
};

// Create a reverse map for quick lookups. From 'part#' -> 'part_number'
const REVERSE_ALIAS_MAP = new Map();
for (const canonicalKey in ALIAS_MAP) {
  for (const alias of ALIAS_MAP[canonicalKey]) {
    REVERSE_ALIAS_MAP.set(normalizeKey(alias), canonicalKey);
  }
}

function computeLowState(item, total_quantity) {
  // ... (this function does not need to change)
  const { alert_enabled, low_stock_threshold, reorder_level } = item;
  const qty = total_quantity;
  if (alert_enabled === false)
    return { low: false, reason: null, threshold: null, qty };
  let reason = null,
    threshold = null;
  if (low_stock_threshold != null && reorder_level != null) {
    threshold = Math.min(low_stock_threshold, reorder_level);
    reason =
      threshold === low_stock_threshold
        ? 'low_stock_threshold'
        : 'reorder_level';
  } else if (low_stock_threshold != null) {
    threshold = low_stock_threshold;
  } else if (reorder_level != null) {
    threshold = reorder_level;
    reason = 'reorder_level';
  }
  if (threshold == null)
    return { low: false, reason: null, threshold: null, qty };
  return { low: qty <= threshold, reason, threshold, qty };
}

function cleanAttributes(input = {}) {
  // ... (this function does not need to change)
  const out = {};
  for (const key in input) {
    if (CORE_FIELDS.has(key)) continue;
    const val = input[key];
    if (val != null && val !== '') out[key] = val;
  }
  return out;
}

function normalizeKey(k) {
  if (k == null) return null;
  return String(k)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

module.exports = {
  computeLowState,
  cleanAttributes,
  CORE_FIELDS,
  normalizeKey,
  REVERSE_ALIAS_MAP, // Export the new map
};
