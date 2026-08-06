// inventory-service/controllers/_stockLogic.js

const CORE_FIELDS = new Set([
  'part_number',
  'lot_number',
  'name',
  'description',
  'barcode',
  'vendor_barcode',
  'uom',
  'reorder_level',
  'low_stock_threshold',
  'alert_enabled',
  'alert_acknowledged_at',
]);

const ALIAS_MAP = {
  part_number: ['part', 'part_number', 'part #', 'part#', 'pn', 'p/n', 'sku'],
  lot_number: ['lot', 'lot_number', 'lot #', 'lot#', 'batch', 'batch_number'],
  description: ['desc', 'description', 'item_description'],
  name: ['name', 'item_name', 'product_name'],
  vendor_barcode: [
    'barcode',
    'bar code',
    'vendor_barcode',
    'vendor barcode',
    'manufacturer_barcode',
    'manufacturer barcode',
    'supplier_barcode',
    'supplier barcode',
    'upc',
    'gtin',
  ],
  barcode: [
    'internal_barcode',
    'internal barcode',
    'container_barcode',
    'container barcode',
    'inventory_barcode',
    'inventory barcode',
  ],
  uom: ['uom', 'unit', 'units', 'unit_of_measure', 'unit of measure'],
  reorder_level: ['reorder_level', 'reorder point', 'reorder_lvl', 'min_stock'],
  low_stock_threshold: ['low_stock_threshold', 'low stock threshold', 'low_stock'],
};

const REVERSE_ALIAS_MAP = new Map();
for (const canonicalKey in ALIAS_MAP) {
  REVERSE_ALIAS_MAP.set(normalizeKey(canonicalKey), canonicalKey);
  for (const alias of ALIAS_MAP[canonicalKey]) {
    REVERSE_ALIAS_MAP.set(normalizeKey(alias), canonicalKey);
  }
}

function finiteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Computes the low-stock state for a given item and total quantity.
 * A missing threshold never becomes zero through JavaScript coercion.
 */
function computeLowState(item, totalQuantity) {
  const qty = finiteNumberOrNull(totalQuantity) ?? 0;
  const lowThreshold = finiteNumberOrNull(item?.low_stock_threshold);
  const reorderLevel = finiteNumberOrNull(item?.reorder_level);

  let reason = null;
  let threshold = null;

  if (lowThreshold !== null && reorderLevel !== null) {
    threshold = Math.min(lowThreshold, reorderLevel);
    reason = threshold === lowThreshold ? 'low_stock_threshold' : 'reorder_level';
  } else if (lowThreshold !== null) {
    threshold = lowThreshold;
    reason = 'low_stock_threshold';
  } else if (reorderLevel !== null) {
    threshold = reorderLevel;
    reason = 'reorder_level';
  }

  const thresholdConfigured = threshold !== null;
  const low =
    item?.alert_enabled !== false && thresholdConfigured && qty <= threshold;

  return {
    low,
    reason,
    threshold,
    thresholdConfigured,
    qty,
  };
}

function deriveStockStatus(item, totalQuantity) {
  if (item?.review_status === 'needs_review') return 'needs_review';

  const qty = finiteNumberOrNull(totalQuantity) ?? 0;
  if (qty <= 0) return 'out_of_stock';

  const { low } = computeLowState(item, qty);
  return low ? 'low_stock' : 'in_stock';
}

/**
 * Aggregates quantities by part number and applies the same status to each row.
 * Kept for callers that intentionally need part-level aggregation.
 */
function calculateStockLevels(items) {
  const stockByPartNumber = new Map();

  for (const item of items) {
    if (!item.part_number) continue;

    if (!stockByPartNumber.has(item.part_number)) {
      stockByPartNumber.set(item.part_number, {
        totalQuantity: 0,
        representativeItem: item,
        needsReview: false,
      });
    }

    const entry = stockByPartNumber.get(item.part_number);
    entry.totalQuantity +=
      finiteNumberOrNull(item.quantity ?? item.total_quantity) ?? 0;
    entry.needsReview ||= item.review_status === 'needs_review';
  }

  const statusByPartNumber = new Map();
  for (const [partNumber, data] of stockByPartNumber.entries()) {
    const representative = data.needsReview
      ? { ...data.representativeItem, review_status: 'needs_review' }
      : data.representativeItem;

    statusByPartNumber.set(
      partNumber,
      deriveStockStatus(representative, data.totalQuantity),
    );
  }

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
  calculateStockLevels,
  computeLowState,
  deriveStockStatus,
  cleanAttributes,
  CORE_FIELDS,
  normalizeKey,
  REVERSE_ALIAS_MAP,
};
