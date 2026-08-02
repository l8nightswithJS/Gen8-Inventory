export const ITEM_CORE_FIELDS = new Set([
  'part_number',
  'lot_number',
  'name',
  'description',
  'barcode',
  'reorder_level',
  'low_stock_threshold',
  'alert_enabled',
]);

const RESERVED_FIELDS = new Set([
  'id',
  'client_id',
  'attributes',
  'alert_acknowledged_at',
  'created_at',
  'updated_at',
  'last_updated',
  'total_quantity',
  'status',
  'inventory_levels',
]);

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeOptionalInteger(value, label) {
  if (value === undefined || value === null || value === '') return null;

  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} is too large.`);
  }

  return parsed;
}

function isCustomField(key) {
  return !ITEM_CORE_FIELDS.has(key) && !RESERVED_FIELDS.has(key);
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
    barcode: normalizeOptionalText(form.barcode),
    reorder_level: normalizeOptionalInteger(
      form.reorder_level,
      'Reorder Level',
    ),
    low_stock_threshold: normalizeOptionalInteger(
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
