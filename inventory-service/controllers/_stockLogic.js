// inventory-service/controllers/_stockLogic.js

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

const ALIAS_MAP = {
  part_number: ['part', 'part_number', 'part #', 'part#', 'pn', 'p/n', 'sku'],
  lot_number: ['lot', 'lot_number', 'lot #', 'lot#', 'batch', 'batch_number'],
  description: ['desc', 'description', 'item_description'],
  reorder_level: ['reorder_level', 'reorder point', 'reorder_lvl', 'min_stock'],
};

const REVERSE_ALIAS_MAP = new Map();
for (const canonicalKey in ALIAS_MAP) {
  for (const alias of ALIAS_MAP[canonicalKey]) {
    REVERSE_ALIAS_MAP.set(normalizeKey(alias), canonicalKey);
  }
}

/**
 * Computes the low-stock state for a given item and its total aggregated quantity.
 * This is a helper function used by the main calculateStockLevels function.
 */
function computeLowState(item, total_quantity) {
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
    reason = 'low_stock_threshold';
  } else if (reorder_level != null) {
    threshold = reorder_level;
    reason = 'reorder_level';
  }

  if (threshold == null)
    return { low: false, reason: null, threshold: null, qty };

  return { low: qty <= threshold, reason, threshold, qty };
}

/**
 * ✅ NEW: Main function to calculate stock levels by aggregating part numbers.
 * This is the function you should call from your inventoryController.
 */
function calculateStockLevels(items) {
  const stockByPartNumber = new Map();

  // Step 1: Aggregate quantities and store one representative item per part number.
  for (const item of items) {
    if (!item.part_number) continue;

    if (!stockByPartNumber.has(item.part_number)) {
      stockByPartNumber.set(item.part_number, {
        total_quantity: 0,
        representative_item: item, // Store the first item we see
      });
    }

    stockByPartNumber.get(item.part_number).total_quantity +=
      item.quantity || 0;
  }

  // Step 2: Determine the final stock status for each part number.
  const statusByPartNumber = new Map();
  for (const [part_number, data] of stockByPartNumber.entries()) {
    const { low } = computeLowState(
      data.representative_item,
      data.total_quantity,
    );
    const isOutOfStock = data.total_quantity <= 0;

    let status = 'in_stock';
    if (isOutOfStock) {
      status = 'out_of_stock';
    } else if (low) {
      status = 'low_stock';
    }
    statusByPartNumber.set(part_number, status);
  }

  // Step 3: Map the correct status back to each individual item.
  return items.map((item) => ({
    ...item,
    status: statusByPartNumber.get(item.part_number) || 'in_stock',
  }));
}

function cleanAttributes(input = {}) {
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
  // Export the main function
  calculateStockLevels,
  // Keep other exports for potential use elsewhere
  computeLowState,
  cleanAttributes,
  CORE_FIELDS,
  normalizeKey,
  REVERSE_ALIAS_MAP,
};
