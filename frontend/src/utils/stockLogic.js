// src/utils/stockLogic.js
export const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const qtyFrom = (attrs = {}) =>
  numOrNull(
    attrs.quantity ?? attrs.on_hand ?? attrs.qty_in_stock ?? attrs.stock,
  );

export const thresholdsFrom = (attrs = {}) => {
  const lowStock = numOrNull(attrs.low_stock_threshold);
  const reorder = numOrNull(
    attrs.reorder_level ?? attrs.reorder_point ?? attrs.safety_stock,
  );
  return { lowStock, reorder };
};

export const alertOn = (attrs = {}) =>
  attrs.alert_enabled === false ? false : true;

/**
 * Consistent low-stock decision for table, alerts page, exports, etc.
 * Returns { low, reason, threshold, qty }
 * - reason: "low_stock_threshold" | "reorder_level" | null
 */
export const computeLowState = (attrs = {}) => {
  const qty = qtyFrom(attrs);
  const { lowStock, reorder } = thresholdsFrom(attrs);
  const enabled = alertOn(attrs);

  if (!enabled || qty == null) {
    return { low: false, reason: null, threshold: null, qty };
  }

  // pick the strictest available threshold
  let reason = null;
  let threshold = null;

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
};
