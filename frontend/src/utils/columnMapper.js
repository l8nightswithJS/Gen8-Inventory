export function normalizeKey(value) {
  if (value == null) return null;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

const ALIAS_MAP = {
  part_number: ['part', 'part_number', 'part #', 'part#', 'pn', 'p/n', 'sku'],
  lot_number: ['lot', 'lot_number', 'lot #', 'lot#', 'batch', 'batch_number'],
  description: ['desc', 'description', 'item_description'],
  name: ['name', 'item_name', 'product_name'],
  vendor_barcode: [
    'barcode',
    'bar code',
    'barcodes',
    'vendor barcode',
    'vendor_barcode',
    'manufacturer barcode',
    'manufacturer_barcode',
    'supplier barcode',
    'supplier_barcode',
    'upc',
    'gtin',
  ],
  barcode: [
    'internal barcode',
    'internal_barcode',
    'container barcode',
    'container_barcode',
    'inventory barcode',
    'inventory_barcode',
  ],
  uom: ['uom', 'unit', 'units', 'unit of measure', 'unit_of_measure'],
  inventory_location: [
    'location',
    'locations',
    'inventory location',
    'inventory_location',
    'bin',
    'bin location',
    'shelf',
  ],
  total_quantity: [
    'quantity',
    'on hand',
    'on_hand',
    'qty in stock',
    'qty_in_stock',
    'stock',
    'total quantity',
    'total_quantity',
  ],
  reorder_level: ['reorder_level', 'reorder point', 'reorder_lvl', 'min_stock'],
  low_stock_threshold: [
    'low_stock_threshold',
    'low stock threshold',
    'low_stock',
  ],
  status: ['status', 'stock status', 'inventory status'],
};

const REVERSE_ALIAS_MAP = new Map();
for (const canonicalKey in ALIAS_MAP) {
  REVERSE_ALIAS_MAP.set(normalizeKey(canonicalKey), canonicalKey);
  for (const alias of ALIAS_MAP[canonicalKey]) {
    REVERSE_ALIAS_MAP.set(normalizeKey(alias), canonicalKey);
  }
}

export function getCanonicalKey(input) {
  const normalized = normalizeKey(input);
  return REVERSE_ALIAS_MAP.get(normalized) || normalized;
}
