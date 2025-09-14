// frontend/src/utils/columnMapper.js (New File)

// A function to clean up and standardize column names
export function normalizeKey(k) {
  if (k == null) return null;
  return String(k)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

// The master list of all possible names for our core fields
const ALIAS_MAP = {
  part_number: ['part', 'part_number', 'part #', 'part#', 'pn', 'p/n', 'sku'],
  lot_number: ['lot', 'lot_number', 'lot #', 'lot#', 'batch', 'batch_number'],
  description: ['desc', 'description', 'item_description'],
  name: ['name', 'item_name', 'product_name'],
  barcode: ['barcode', 'bar code', 'upc'],
  total_quantity: [
    'quantity',
    'on_hand',
    'qty_in_stock',
    'stock',
    'total_quantity',
  ],
  reorder_level: ['reorder_level', 'reorder point', 'reorder_lvl', 'min_stock'],
  low_stock_threshold: ['low_stock_threshold', 'low_stock'],
};

// A reverse map for quick lookups (e.g., from 'part#' -> 'part_number')
const REVERSE_ALIAS_MAP = new Map();
for (const canonicalKey in ALIAS_MAP) {
  REVERSE_ALIAS_MAP.set(canonicalKey, canonicalKey); // The canonical key maps to itself
  for (const alias of ALIAS_MAP[canonicalKey]) {
    REVERSE_ALIAS_MAP.set(normalizeKey(alias), canonicalKey);
  }
}

/**
 * Takes a messy user-entered column name and returns the official,
 * canonical key if it's a known core field.
 * @param {string} input - The user-entered column name (e.g., "Part #")
 * @returns {string} The canonical key (e.g., "part_number") or the normalized input.
 */
export function getCanonicalKey(input) {
  const normalized = normalizeKey(input);
  return REVERSE_ALIAS_MAP.get(normalized) || normalized;
}
