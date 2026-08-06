const WRITABLE_CORE_FIELDS = new Set([
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
]);

const TEXT_FIELDS = new Set([
  'part_number',
  'lot_number',
  'name',
  'description',
  'barcode',
  'vendor_barcode',
  'uom',
]);

const DECIMAL_FIELDS = new Set(['reorder_level', 'low_stock_threshold']);

const READ_ONLY_FIELDS = new Set([
  'id',
  'client_id',
  'attributes',
  'alert_acknowledged_at',
  'created_at',
  'updated_at',
  'last_updated',
  'total_quantity',
  'status',
  'threshold_configured',
  'inventory_levels',
  'inventory_location',
  'inventory_record_count',
  'review_status',
  'review_issues',
  'reviewed_at',
  '__proto__',
  'prototype',
  'constructor',
]);

const RESERVED_OPERATIONAL_ATTRIBUTES = new Set([
  'location',
  'locations',
  'inventory_location',
  'on_hand',
  'on_hand_review',
  'total_quantity',
  'quantity',
  'review_status',
  'review_issues',
]);

class ItemContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ItemContractError';
    this.status = 400;
  }
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeAttributeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

function normalizeClientId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new ItemContractError('client_id must be a positive integer.');
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new ItemContractError('client_id must be a safe positive integer.');
  }

  return parsed;
}

function normalizeText(value, field, { required = false } = {}) {
  if (value === undefined) return undefined;
  if (value === null) {
    if (required) throw new ItemContractError(`${field} is required.`);
    return null;
  }

  // Spreadsheet libraries commonly return identifier-looking cells as
  // numbers. Accept finite numeric values and normalize them to text so part
  // numbers, lot numbers, and barcodes can be imported without weakening the
  // contract for arrays, objects, or booleans.
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ItemContractError(`${field} must be a string.`);
    }
    value = String(value);
  } else if (typeof value === 'bigint') {
    value = String(value);
  }

  if (typeof value !== 'string') {
    throw new ItemContractError(`${field} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    if (required) throw new ItemContractError(`${field} is required.`);
    return null;
  }

  return normalized;
}

function normalizeNonNegativeDecimal(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
    throw new ItemContractError(
      `${field} must be a non-negative number with no more than 3 decimal places.`,
    );
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed > 99999999999.999) {
    throw new ItemContractError(`${field} is outside the supported range.`);
  }

  return parsed;
}

function normalizeBoolean(value, field) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;

  throw new ItemContractError(`${field} must be a boolean.`);
}

function isReservedAttributeKey(key) {
  return (
    WRITABLE_CORE_FIELDS.has(key) ||
    READ_ONLY_FIELDS.has(key) ||
    RESERVED_OPERATIONAL_ATTRIBUTES.has(normalizeAttributeKey(key))
  );
}

function normalizeAttributes(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) {
    throw new ItemContractError('attributes must be an object.');
  }

  const attributes = {};
  for (const [rawKey, attributeValue] of Object.entries(value)) {
    const key = String(rawKey).trim();
    if (!key || isReservedAttributeKey(key) || attributeValue === undefined) {
      continue;
    }
    attributes[key] = attributeValue;
  }

  return attributes;
}

function normalizeItemPayload(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    throw new ItemContractError('Item payload must be an object.');
  }

  const coreData = {};

  for (const field of WRITABLE_CORE_FIELDS) {
    if (!hasOwn(body, field)) continue;

    let value;
    if (TEXT_FIELDS.has(field)) {
      value = normalizeText(body[field], field, {
        required: field === 'part_number',
      });
    } else if (DECIMAL_FIELDS.has(field)) {
      value = normalizeNonNegativeDecimal(body[field], field);
    } else if (field === 'alert_enabled') {
      value = normalizeBoolean(body[field], field);
    }

    if (value !== undefined) coreData[field] = value;
  }

  if (!partial && !hasOwn(coreData, 'part_number')) {
    throw new ItemContractError('part_number is required.');
  }

  if (!partial && !hasOwn(coreData, 'alert_enabled')) {
    coreData.alert_enabled = true;
  }

  const nestedAttributesProvided = hasOwn(body, 'attributes');
  const attributes = normalizeAttributes(body.attributes);
  let legacyAttributesProvided = false;

  // Preserve compatibility with older clients that submitted custom fields at
  // the top level, while never copying database/read-only or operational fields
  // such as Location and On Hand into JSON attributes.
  for (const [key, value] of Object.entries(body)) {
    if (isReservedAttributeKey(key) || value === undefined) {
      continue;
    }

    legacyAttributesProvided = true;
    attributes[key] = value;
  }

  return {
    coreData,
    attributes,
    attributesProvided:
      !partial || nestedAttributesProvided || legacyAttributesProvided,
  };
}

function normalizeCreateItemPayload(body) {
  const clientId = normalizeClientId(body?.client_id);
  const { coreData, attributes } = normalizeItemPayload(body, {
    partial: false,
  });

  return { clientId, coreData, attributes };
}

function normalizeUpdateItemPayload(body) {
  return normalizeItemPayload(body, { partial: true });
}

module.exports = {
  ItemContractError,
  READ_ONLY_FIELDS,
  WRITABLE_CORE_FIELDS,
  normalizeAttributes,
  normalizeCreateItemPayload,
  normalizeNonNegativeDecimal,
  normalizeUpdateItemPayload,
};
