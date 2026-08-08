export const PROFILE_PRESETS = {
  general: {
    key: 'general',
    label: 'General Inventory',
    default_uom: '',
    display_columns: [
      'part_number',
      'name',
      'description',
      'lot_number',
      'inventory_location',
      'total_quantity',
      'uom',
      'status',
    ],
    field_definitions: [],
    import_aliases: {},
  },
  resin: {
    key: 'resin',
    label: 'Resin / Raw Material',
    default_uom: 'lb',
    display_columns: [
      'part_number',
      'name',
      'manufacturer',
      'lot_number',
      'material_type',
      'color',
      'inventory_location',
      'total_quantity',
      'uom',
      'container_status',
      'status',
    ],
    field_definitions: [
      { key: 'label_name', label: 'Label Name', type: 'text' },
      { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { key: 'material_type', label: 'Material Type', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'additive', label: 'Additive', type: 'text' },
      { key: 'on_order', label: 'On Order', type: 'decimal' },
    ],
    import_aliases: {
      'Label Name': 'label_name',
      MFG: 'manufacturer',
      Manufacturer: 'manufacturer',
      Type: 'material_type',
      Additive: 'additive',
      Color: 'color',
      'On Order': 'on_order',
    },
  },
  molded_parts: {
    key: 'molded_parts',
    label: 'Molded Parts',
    default_uom: 'pieces',
    display_columns: [
      'part_number',
      'description',
      'revision',
      'lot_number',
      'mold_number',
      'cavity',
      'condition',
      'inventory_location',
      'total_quantity',
      'uom',
      'container_status',
      'status',
    ],
    field_definitions: [
      { key: 'drawing_number', label: 'Drawing Number', type: 'text' },
      { key: 'revision', label: 'Revision', type: 'text' },
      { key: 'mold_number', label: 'Mold Number', type: 'text' },
      { key: 'cavity', label: 'Cavity', type: 'text' },
      {
        key: 'condition',
        label: 'Condition',
        type: 'select',
        options: ['Accepted', 'Quarantine', 'Hold', 'Rejected'],
      },
      {
        key: 'inspection_status',
        label: 'Inspection Status',
        type: 'select',
        options: ['Not Inspected', 'Passed', 'Failed', 'Conditional'],
      },
      { key: 'received_date', label: 'Received Date', type: 'date' },
    ],
    import_aliases: {
      'Drawing #': 'drawing_number',
      'Drawing Number': 'drawing_number',
      Rev: 'revision',
      Revision: 'revision',
      Mold: 'mold_number',
      'Mold #': 'mold_number',
      Cavity: 'cavity',
      Condition: 'condition',
      'Inspection Status': 'inspection_status',
      'Received Date': 'received_date',
    },
  },
  genmark_components: {
    key: 'genmark_components',
    label: 'GenMark Components / Packaging',
    default_uom: 'ea',
    display_columns: [
      'part_number',
      'description',
      'manufacturer_part_number',
      'vendor_item_number',
      'category',
      'lot_number',
      'batch_number',
      'inventory_location',
      'total_quantity',
      'uom',
      'minimum_quantity',
      'reorder_level',
      'weekly_demand',
      'weeks_on_hand',
      'suggested_reorder',
      'status',
      'priority',
    ],
    field_definitions: [
      {
        key: 'manufacturer_part_number',
        label: 'Manufacturer Part Number',
        type: 'text',
      },
      { key: 'vendor_item_number', label: 'Vendor Item Number', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      {
        key: 'usage_per_assembly',
        label: 'Usage per Assembly',
        type: 'decimal',
      },
      { key: 'weekly_demand', label: 'Weekly Demand', type: 'decimal' },
      { key: 'minimum_quantity', label: 'Minimum Quantity', type: 'decimal' },
      { key: 'reorder_quantity', label: 'Reorder Quantity', type: 'decimal' },
      { key: 'target_quantity', label: 'Target Quantity', type: 'decimal' },
      { key: 'batch_number', label: 'Batch Number', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'long_text' },
    ],
    import_aliases: {
      'GenMark Item #': 'part_number',
      'Mfg Material #': 'manufacturer_part_number',
      'Vendor Item #': 'vendor_item_number',
      Description: 'description',
      Category: 'category',
      Unit: 'uom',
      'Current Qty': 'total_quantity',
      'Usage / Assembly': 'usage_per_assembly',
      'Weekly Demand': 'weekly_demand',
      'Minimum Qty': 'minimum_quantity',
      'Reorder Level': 'reorder_level',
      'Reorder Qty': 'reorder_quantity',
      'Target Qty': 'target_quantity',
      'Batch #': 'batch_number',
      'Lot #': 'lot_number',
      Notes: 'notes',
      'Weeks on Hand': null,
      'Suggested Reorder': null,
      'Stock Status': null,
      Priority: null,
    },
  },
};

export const CORE_IMPORT_FIELDS = [
  { key: 'part_number', label: 'Part Number' },
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'lot_number', label: 'Lot Number' },
  { key: 'uom', label: 'Unit of Measure' },
  { key: 'total_quantity', label: 'Current / On-Hand Quantity' },
  { key: 'location', label: 'Location' },
  { key: 'reorder_level', label: 'Reorder Level' },
  { key: 'low_stock_threshold', label: 'Low-Stock Threshold' },
  { key: 'vendor_barcode', label: 'Vendor Barcode' },
];

export const CALCULATED_IMPORT_FIELDS = [
  {
    key: 'weeks_on_hand',
    label: 'Weeks on Hand',
    aliases: ['weeks on hand', 'weeks_on_hand'],
  },
  {
    key: 'suggested_reorder',
    label: 'Suggested Reorder',
    aliases: ['suggested reorder', 'suggested_reorder'],
  },
  {
    key: 'status',
    label: 'Stock Status',
    aliases: ['stock status', 'inventory status', 'status'],
  },
  {
    key: 'priority',
    label: 'Priority',
    aliases: ['priority'],
  },
];

const GLOBAL_ALIASES = {
  part_number: ['part', 'part number', 'part #', 'part#', 'pn', 'p/n', 'sku'],
  lot_number: ['lot', 'lot number', 'lot #', 'lot#', 'batch'],
  description: ['desc', 'description', 'item description'],
  name: ['name', 'item name', 'product name'],
  uom: ['uom', 'unit', 'units', 'unit of measure'],
  total_quantity: [
    'quantity',
    'on hand',
    'current qty',
    'current quantity',
    'qty in stock',
    'stock',
  ],
  location: ['location', 'locations', 'bin', 'bin location', 'shelf'],
  reorder_level: ['reorder level', 'reorder point', 'min stock'],
  low_stock_threshold: ['low stock threshold', 'low stock'],
  vendor_barcode: ['barcode', 'vendor barcode', 'manufacturer barcode', 'upc', 'gtin'],
};

export function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');
}

function aliasLookup(settings = {}) {
  const lookup = new Map();
  for (const [target, aliases] of Object.entries(GLOBAL_ALIASES)) {
    lookup.set(normalizeKey(target), target);
    aliases.forEach((alias) => lookup.set(normalizeKey(alias), target));
  }

  const profileAliases = {
    ...(PROFILE_PRESETS[settings.profile_key]?.import_aliases || {}),
    ...(settings.import_aliases || {}),
  };
  Object.entries(profileAliases).forEach(([source, target]) => {
    lookup.set(normalizeKey(source), target == null ? null : normalizeKey(target));
  });
  return lookup;
}

export function getCalculatedImportField(header) {
  const normalized = normalizeKey(header);
  return (
    CALCULATED_IMPORT_FIELDS.find((field) =>
      field.aliases.some((alias) => normalizeKey(alias) === normalized),
    ) || null
  );
}

export function buildColumnMapping(headers, settings = {}) {
  const lookup = aliasLookup(settings);
  const mapping = {};
  headers.forEach((header) => {
    const normalized = normalizeKey(header);
    mapping[header] = lookup.has(normalized) ? lookup.get(normalized) : null;
  });
  return mapping;
}

export function getImportFieldOptions(settings = {}) {
  const custom = (settings.field_definitions || []).map((definition) => ({
    key: definition.key,
    label: definition.label,
  }));
  return [...CORE_IMPORT_FIELDS, ...custom];
}

function rowScore(row, settings) {
  const headers = row.map((value) => String(value || '').trim()).filter(Boolean);
  if (headers.length < 2) return 0;

  const mapping = buildColumnMapping(headers, settings);
  const recognized = Object.values(mapping).filter(Boolean);
  const unique = new Set(recognized);
  let score = unique.size;
  if (unique.has('part_number')) score += 4;
  if (unique.has('description') || unique.has('name')) score += 2;
  if (unique.has('total_quantity')) score += 3;
  if (unique.has('uom')) score += 1;
  return score;
}

export function detectHeaderRow(matrix, settings = {}, maxRows = 20) {
  let bestIndex = 0;
  let bestScore = -1;
  const limit = Math.min(matrix.length, maxRows);
  for (let index = 0; index < limit; index += 1) {
    const score = rowScore(matrix[index] || [], settings);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }
  return { index: bestIndex, score: bestScore };
}

export function detectBestSheet(sheetMatrices, settings = {}) {
  let best = null;
  Object.entries(sheetMatrices).forEach(([sheetName, matrix]) => {
    const detected = detectHeaderRow(matrix, settings);
    const nameBonus = /inventory\s*master/i.test(sheetName) ? 5 : 0;
    const score = detected.score + nameBonus;
    if (!best || score > best.score) {
      best = {
        sheetName,
        headerIndex: detected.index,
        score,
      };
    }
  });
  return best;
}

export function matrixToObjects(matrix, headerIndex) {
  const rawHeaders = matrix[headerIndex] || [];
  const headers = rawHeaders.map((value, index) => {
    const text = String(value || '').trim();
    return text || `__blank_${index}`;
  });

  return matrix
    .slice(headerIndex + 1)
    .filter((row) => row.some((value) => String(value ?? '').trim() !== ''))
    .map((row) => {
      const object = {};
      headers.forEach((header, index) => {
        if (!header.startsWith('__blank_')) object[header] = row[index] ?? '';
      });
      return object;
    });
}

export function filterMappedDataRows(rows, mapping) {
  const identityHeaders = Object.entries(mapping)
    .filter(([, target]) =>
      ['part_number', 'vendor_item_number', 'description', 'name'].includes(target),
    )
    .map(([source]) => source);

  return rows.filter((row) =>
    identityHeaders.some((header) => {
      const value = String(row[header] ?? '').trim();
      return value && !/^total\b/i.test(value);
    }),
  );
}
