// src/utils/stockLogic.js
/**
 * Decide "low" / "out" from common inventory fields safely.
 */
export function computeLowState(attrs = {}) {
  const num = (v) =>
    v === '' || v == null || isNaN(Number(v)) ? null : Number(v);
  const quantity =
    num(attrs.quantity) ??
    num(attrs.on_hand) ??
    num(attrs.qty_in_stock) ??
    num(attrs.stock);
  const reorderLevel =
    num(attrs.reorder_level) ?? num(attrs.min) ?? num(attrs.threshold);

  if (quantity == null) return { low: false, status: 'unknown' };
  if (quantity <= 0) return { low: true, status: 'out' };
  if (reorderLevel != null && quantity <= reorderLevel)
    return { low: true, status: 'low' };
  return { low: false, status: 'ok' };
}
