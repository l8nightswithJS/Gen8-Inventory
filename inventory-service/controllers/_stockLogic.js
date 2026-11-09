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
  // Database queries supply an aggregated total; normalize missing or invalid totals.
  const numericQuantity =
    total_quantity == null ? null : Number(total_quantity);
  const qty =
    numericQuantity !== null && Number.isFinite(numericQuantity)
      ? numericQuantity
      : null;

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

  if (threshold == null || qty === null)
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

    // listItems supplies total_quantity from SUM(inventory.quantity).
    // Fall back to quantity for other callers supplying non-aggregated rows.
    const rawQuantity = item.total_quantity ?? item.quantity;
    const quantity = rawQuantity == null ? 0 : Number(rawQuantity);
    stockByPartNumber.get(item.part_number).total_quantity +=
      Number.isFinite(quantity) ? quantity : 0;
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
  return items.map((item) => {
    if (!item.part_number) {
      // R&D materials may not have part numbers; calculate status per item.
      const rawQuantity = item.total_quantity ?? item.quantity;
      if (rawQuantity != null) {
        const qty = Number(rawQuantity);
        if (Number.isFinite(qty)) {
          const status =
            qty <= 0
              ? 'out_of_stock'
              : computeLowState(item, qty).low
                ? 'low_stock'
                : 'in_stock';
          return { ...item, status };
        }
      }
      return { ...item, status: 'in_stock' };
    }
    return {
      ...item,
      status: statusByPartNumber.get(item.part_number) || 'in_stock',
    };
  });
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
