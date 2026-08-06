const PROFILE_KEYS = Object.freeze([
  'general',
  'resin',
  'molded_parts',
  'genmark_components',
]);

const CORE_FIELDS = Object.freeze([
  'part_number',
  'name',
  'description',
  'lot_number',
  'inventory_location',
  'total_quantity',
  'uom',
  'status',
  'reorder_level',
  'low_stock_threshold',
  'vendor_barcode',
  'barcode',
]);

const DERIVED_FIELDS = Object.freeze([
  'weeks_on_hand',
  'suggested_reorder',
  'priority',
]);

const RESERVED_FIELD_KEYS = new Set([
  ...CORE_FIELDS,
  ...DERIVED_FIELDS,
  'id',
  'client_id',
  'attributes',
  'location',
  'locations',
  'quantity',
  'on_hand',
  'review_status',
  'review_issues',
  'reviewed_at',
  'inventory_levels',
  'inventory_record_count',
  'threshold_configured',
  'alert_enabled',
  'alert_acknowledged_at',
  'created_at',
  'updated_at',
  'last_updated',
  '__proto__',
  'prototype',
  'constructor',
]);

const PROFILE_PRESETS = Object.freeze({
  general: {
    key: 'general',
    label: 'General Inventory',
    defaultUom: null,
    displayColumns: [
      'part_number',
      'name',
      'description',
      'lot_number',
      'inventory_location',
      'total_quantity',
      'uom',
      'status',
    ],
    fieldDefinitions: [],
    importAliases: {},
  },
  resin: {
    key: 'resin',
    label: 'Resin / Raw Material',
    defaultUom: 'lb',
    displayColumns: [
      'part_number',
      'name',
      'manufacturer',
      'lot_number',
      'material_type',
      'color',
      'additive',
      'inventory_location',
      'total_quantity',
      'uom',
      'status',
    ],
    fieldDefinitions: [
      { key: 'label_name', label: 'Label Name', type: 'text' },
      { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { key: 'material_type', label: 'Material Type', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'additive', label: 'Additive', type: 'text' },
      { key: 'on_order', label: 'On Order', type: 'decimal' },
    ],
    importAliases: {
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
    defaultUom: 'pieces',
    displayColumns: [
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
      'status',
    ],
    fieldDefinitions: [
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
    importAliases: {
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
    defaultUom: 'ea',
    displayColumns: [
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
    fieldDefinitions: [
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
    importAliases: {
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
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeProfileKey(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return PROFILE_KEYS.includes(normalized) ? normalized : 'general';
}

function getProfilePreset(value) {
  return clone(PROFILE_PRESETS[normalizeProfileKey(value)]);
}

function normalizeFieldKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');
}

function isReservedFieldKey(value) {
  return RESERVED_FIELD_KEYS.has(normalizeFieldKey(value));
}

function sanitizeFieldDefinition(raw) {
  const key = normalizeFieldKey(raw?.key);
  const label = String(raw?.label || key || '').trim();
  if (!key || !label) return null;
  if (isReservedFieldKey(key)) {
    throw new Error(`Custom field key "${key}" is reserved by the inventory system.`);
  }

  const supportedTypes = new Set([
    'text',
    'long_text',
    'decimal',
    'number',
    'date',
    'boolean',
    'select',
  ]);
  const type = supportedTypes.has(raw?.type) ? raw.type : 'text';
  const definition = {
    key,
    label,
    type,
    required: raw?.required === true,
  };

  if (type === 'select') {
    definition.options = Array.from(
      new Set(
        (Array.isArray(raw?.options) ? raw.options : [])
          .map((option) => String(option).trim())
          .filter(Boolean),
      ),
    );
  }

  return definition;
}

function normalizeSettings(raw = {}) {
  const preset = getProfilePreset(raw.profile_key || raw.profileKey);
  const displayColumns = Array.isArray(raw.display_columns)
    ? raw.display_columns
    : Array.isArray(raw.displayColumns)
      ? raw.displayColumns
      : preset.displayColumns;
  const fieldDefinitions = Array.isArray(raw.field_definitions)
    ? raw.field_definitions
    : Array.isArray(raw.fieldDefinitions)
      ? raw.fieldDefinitions
      : preset.fieldDefinitions;

  return {
    profile_key: preset.key,
    profile_label: preset.label,
    default_uom: raw.default_uom || raw.defaultUom || preset.defaultUom,
    default_location_id:
      raw.default_location_id == null ? null : Number(raw.default_location_id),
    display_columns: Array.from(
      new Set(displayColumns.map(normalizeFieldKey).filter(Boolean)),
    ),
    field_definitions: fieldDefinitions
      .map(sanitizeFieldDefinition)
      .filter(Boolean),
    import_aliases: {
      ...preset.importAliases,
      ...(raw.import_aliases || raw.importAliases || {}),
    },
  };
}

function normalizeNullableText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text || /^n\/?a$/i.test(text)) return null;
  return text;
}

function coerceAttributeValue(value, definition) {
  if (value === undefined || value === null || value === '') return null;

  switch (definition.type) {
    case 'decimal':
    case 'number': {
      const normalized = String(value).trim().replace(/,/g, '');
      if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
        throw new Error(`${definition.label} must be numeric.`);
      }
      const numeric = Number(normalized);
      if (!Number.isFinite(numeric)) {
        throw new Error(`${definition.label} must be numeric.`);
      }
      return definition.type === 'number' ? Math.trunc(numeric) : numeric;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value;
      const normalized = String(value).trim().toLowerCase();
      if (['true', 'yes', '1'].includes(normalized)) return true;
      if (['false', 'no', '0'].includes(normalized)) return false;
      throw new Error(`${definition.label} must be yes/no or true/false.`);
    }
    case 'date': {
      const normalized = normalizeNullableText(value);
      if (!normalized) return null;
      const date = new Date(normalized);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`${definition.label} must be a valid date.`);
      }
      return date.toISOString().slice(0, 10);
    }
    case 'select': {
      const normalized = normalizeNullableText(value);
      if (!normalized) return null;
      if (
        Array.isArray(definition.options) &&
        definition.options.length > 0 &&
        !definition.options.includes(normalized)
      ) {
        throw new Error(
          `${definition.label} must be one of: ${definition.options.join(', ')}.`,
        );
      }
      return normalized;
    }
    case 'long_text':
    case 'text':
    default:
      return normalizeNullableText(value);
  }
}

function coerceAttributes(attributes, fieldDefinitions) {
  const definitions = new Map(
    (fieldDefinitions || []).map((definition) => [definition.key, definition]),
  );
  const result = {};

  for (const [key, value] of Object.entries(attributes || {})) {
    const definition = definitions.get(key);
    result[key] = definition
      ? coerceAttributeValue(value, definition)
      : value;
  }

  for (const definition of definitions.values()) {
    if (
      definition.required &&
      (result[definition.key] === null ||
        result[definition.key] === undefined ||
        result[definition.key] === '')
    ) {
      throw new Error(`${definition.label} is required.`);
    }
  }

  return result;
}

module.exports = {
  CORE_FIELDS,
  DERIVED_FIELDS,
  PROFILE_KEYS,
  PROFILE_PRESETS,
  RESERVED_FIELD_KEYS,
  coerceAttributeValue,
  coerceAttributes,
  getProfilePreset,
  isReservedFieldKey,
  normalizeFieldKey,
  normalizeProfileKey,
  normalizeSettings,
  sanitizeFieldDefinition,
};
