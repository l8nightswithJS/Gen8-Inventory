// backend/controllers/_stockLogic.js
// Utilities shared across controllers for low-stock logic & attributes handling

const BAD_STRINGS = new Set(['undefined', 'null', 'nan']);

// Return number or null
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Pull quantity value from a flexible attributes record
function qtyFrom(attrs = {}) {
  return (
    num(attrs.quantity) ??
    num(attrs.on_hand) ??
    num(attrs.qty_in_stock) ??
    num(attrs.stock)
  );
}

// Normalize threshold fields
function thresholdsFrom(attrs = {}) {
  const lowStock = num(attrs.low_stock_threshold);
  const reorder = num(
    attrs.reorder_level ?? attrs.reorder_point ?? attrs.safety_stock,
  );
  return { lowStock, reorder };
}

// Treat missing or explicit false as disabled
function alertOn(attrs = {}) {
  return attrs.alert_enabled === false ? false : true;
}

// Single source of truth for LOW state across the backend
function computeLowState(attrs = {}) {
  const qty = qtyFrom(attrs);
  const { lowStock, reorder } = thresholdsFrom(attrs);
  const enabled = alertOn(attrs);

  if (!enabled || qty == null) {
    return { low: false, reason: null, threshold: null, qty };
  }

  let reason = null,
    threshold = null;
  if (lowStock != null && reorder != null) {
    threshold = Math.min(lowStock, reorder);
    reason = threshold === lowStock ? 'low_stock_threshold' : 'reorder_level';
  } else if (lowStock != null) {
    threshold = lowStock;
    reason = 'low_stock_threshold';
  } else if (reorder != null) {
    threshold = reorder;
    reason = 'reorder_level';
  }

  if (threshold == null)
    return { low: false, reason: null, threshold: null, qty };
  return { low: qty <= threshold, reason, threshold, qty };
}

// snake_case keys and keep a-z0-9_
function normalizeKey(k) {
  if (k == null) return null;
  return String(k)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

// Clean up an attributes map (drop empty/null, coerce booleans, numbers)
function cleanAttributes(input = {}) {
  const out = {};
  for (const rawKey of Object.keys(input)) {
    const key = normalizeKey(rawKey);
    if (!key) continue;

    const rawVal = input[rawKey];
    if (rawVal == null) continue;
    if (
      typeof rawVal === 'string' &&
      BAD_STRINGS.has(rawVal.trim().toLowerCase())
    )
      continue;

    if (typeof rawVal === 'boolean') {
      out[key] = rawVal;
      continue;
    }

    const maybeNum = num(rawVal);
    if (maybeNum != null) {
      out[key] = maybeNum;
      continue;
    }

    out[key] = String(rawVal).trim();
  }
  delete out.undefined;
  delete out.null;
  return out;
}

module.exports = {
  num,
  qtyFrom,
  thresholdsFrom,
  alertOn,
  computeLowState,
  normalizeKey,
  cleanAttributes,
};
