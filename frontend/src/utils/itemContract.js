export const ITEM_CORE_FIELDS = new Set([
  'part_number',
  'lot_number',
  'name',
  'description',
  'vendor_barcode',
  'uom',
  'reorder_level',
  'low_stock_threshold',
  'alert_enabled',
]);

const RESERVED_FIELDS = new Set([
  'id',
  'client_id',
  'product_id',
  'receipt_line_id',
  'source_container_id',
  'barcode',
  'attributes',
  'alert_acknowledged_at',
  'created_at',
  'updated_at',
  'last_updated',
  'total_quantity',
  'initial_quantity',
  'container_status',
  'quality_status',
  'quality_updated_at',
  'quality_notes',
  'package_type',
  'emptied_at',
  'archived_at',
  'status',
  'threshold_configured',
  'inventory_levels',
  'inventory_location',
  'inventory_record_count',
  'review_status',
  'review_issues',
  'reviewed_at',
  'location',
  'locations',
  'on_hand',
  'on_hand_review',
  '__proto__',
  'prototype',
  'constructor',
]);

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeOptionalDecimal(value, label) {
  if (value === undefined || value === null || value === '') return null;

  const raw = String(value).trim();
  const normalized = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,3})?$/.test(raw)
    ? raw.replace(/,/g, '')
    : raw;
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
    throw new Error(
      `${label} must be a non-negative number with no more than 3 decimal places.`,
    );
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed > 99999999999.999) {
    throw new Error(`${label} is outside the supported range.`);
  }

  return parsed;
}

function normalizeFieldKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

function isCustomField(key) {
  const normalized = normalizeFieldKey(key);
  return (
    !ITEM_CORE_FIELDS.has(key) &&
    !RESERVED_FIELDS.has(key) &&
    !RESERVED_FIELDS.has(normalized)
  );
}

export function getCustomAttributeKeys(schema = [], item = null) {
  const keys = new Set([
    ...(Array.isArray(schema) ? schema : []),
    ...Object.keys(item?.attributes || {}),
  ]);

  return [...keys].filter(isCustomField);
}

export function createItemForm(item = null) {
  if (!item) return { alert_enabled: true };

  return {
    part_number: item.part_number ?? '',
    lot_number: item.lot_number ?? '',
    name: item.name ?? '',
    description: item.description ?? '',
    barcode: item.barcode ?? '',
    vendor_barcode: item.vendor_barcode ?? '',
    uom: item.uom ?? '',
    reorder_level: item.reorder_level ?? '',
    low_stock_threshold: item.low_stock_threshold ?? '',
    alert_enabled: item.alert_enabled !== false,
    ...(item.attributes || {}),
  };
}

export function buildItemPayload({ form, customKeys = [], clientId }) {
  const partNumber = normalizeOptionalText(form.part_number);
  if (!partNumber) throw new Error('Part Number is required.');

  const payload = {
    part_number: partNumber,
    lot_number: normalizeOptionalText(form.lot_number),
    name: normalizeOptionalText(form.name),
    description: normalizeOptionalText(form.description),
    vendor_barcode: normalizeOptionalText(form.vendor_barcode),
    uom: normalizeOptionalText(form.uom),
    reorder_level: normalizeOptionalDecimal(
      form.reorder_level,
      'Reorder Level',
    ),
    low_stock_threshold: normalizeOptionalDecimal(
      form.low_stock_threshold,
      'Low-Stock Threshold',
    ),
    alert_enabled: form.alert_enabled !== false,
    attributes: {},
  };

  for (const key of customKeys) {
    if (!isCustomField(key)) continue;
    const value = form[key];
    if (value === undefined || value === null || value === '') continue;
    payload.attributes[key] = value;
  }

  if (clientId !== undefined) {
    const parsedClientId = Number(clientId);
    if (!Number.isSafeInteger(parsedClientId) || parsedClientId <= 0) {
      throw new Error('A valid client is required.');
    }
    payload.client_id = parsedClientId;
  }

  return payload;
}
