// src/components/InventoryTable.jsx
import React, { useEffect, useState, useMemo } from 'react';

const LEGACY_ORDER = [
  'part_number',
  'description',
  'quantity',
  'reorder_level',
  'reorder_qty',
  'lead_times',
  'type',
  'name',
  'location',
  'lot_number',
  'low_stock_threshold',
  'has_lot',
  'alert_enabled',
];

const LABEL_OVERRIDES = {
  part_number: 'Part #',
  quantity: 'On Hand',
  reorder_level: 'Reorder Level',
  reorder_qty: 'Reorder Qty',
  low_stock_threshold: 'Low-Stock Threshold',
  alert_enabled: 'Enable Low-Stock Alert',
};

const humanLabel = (key) =>
  LABEL_OVERRIDES[key] ||
  key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

// ---------- Numeric helpers (safe: null when missing/invalid) ----------
const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const getQty = (attrs) =>
  numOrNull(
    attrs?.quantity ?? attrs?.on_hand ?? attrs?.qty_in_stock ?? attrs?.stock,
  );

const getLowThreshold = (attrs) => numOrNull(attrs?.low_stock_threshold);

const getReorderLevel = (attrs) =>
  numOrNull(
    attrs?.reorder_level ?? attrs?.reorder_point ?? attrs?.safety_stock,
  );

const isAlertEnabled = (attrs) =>
  attrs?.alert_enabled === false ? false : true;

// Columns we never want in the read-only grid by default.
// (Still used for calculations and editing.)
const HIDE_FORCE = new Set(['alert_enabled', 'has_lot', 'low_stock_threshold']);

// Treat a column as boolean if every present value is true/false (or "true"/"false")
const looksBooleanColumn = (key, rows) =>
  rows.every((it) => {
    const v = it.attributes?.[key];
    return (
      v === undefined ||
      v === null ||
      typeof v === 'boolean' ||
      (typeof v === 'string' &&
        (v.toLowerCase() === 'true' || v.toLowerCase() === 'false'))
    );
  });

export default function InventoryTable({
  items,
  page,
  totalPages,
  onPage,
  onEdit,
  onDelete,
  role = 'viewer',
}) {
  const [showRotateNotice, setShowRotateNotice] = useState(false);

  useEffect(() => {
    const updateNotice = () => setShowRotateNotice(window.innerWidth < 775);
    updateNotice();
    window.addEventListener('resize', updateNotice);
    return () => window.removeEventListener('resize', updateNotice);
  }, []);

  const safeItems = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter((i) => i.attributes && typeof i.attributes === 'object')
        : [],
    [items],
  );

  // All discovered keys across items, ordered with legacy biases
  const allKeys = useMemo(() => {
    const keys = Array.from(
      new Set(safeItems.flatMap((item) => Object.keys(item.attributes))),
    );
    return keys.sort((a, b) => {
      const ia = LEGACY_ORDER.indexOf(a);
      const ib = LEGACY_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [safeItems]);

  // Visible keys: hide booleans + forced hiddens
  const visibleKeys = useMemo(() => {
    return allKeys.filter((k) => {
      if (HIDE_FORCE.has(k)) return false;
      if (looksBooleanColumn(k, safeItems)) return false;
      return true;
    });
  }, [allKeys, safeItems]);

  // ----- Row render helpers -----
  const renderCell = (attrs, key) => {
    const value = attrs[key];
    return value != null ? (
      <div className="break-words leading-tight">{String(value)}</div>
    ) : (
      <span className="text-gray-400">—</span>
    );
  };

  const renderRow = (item) => {
    const attrs = item.attributes || {};
    const alertsOn = isAlertEnabled(attrs);

    const qty = getQty(attrs);
    const low = getLowThreshold(attrs);
    const reorder = getReorderLevel(attrs);

    // Only mark low if a real numeric threshold exists
    const lowByLow = qty != null && low != null && qty <= low;
    const lowByReorder = qty != null && reorder != null && qty <= reorder;
    const isLow = alertsOn && (lowByLow || lowByReorder);

    return (
      <tr
        key={item.id}
        className={`border-t hover:bg-gray-50 ${
          isLow ? 'bg-red-50' : 'bg-white'
        }`}
      >
        {visibleKeys.map((key, idx) => (
          <td
            key={key}
            className="px-2 py-1.5 border align-middle text-sm md:text-[13px] whitespace-normal break-words"
          >
            {/* Low badge after first cell */}
            {idx === 0 && isLow ? (
              <div className="flex items-center gap-2">
                {renderCell(attrs, key)}
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  Low
                </span>
              </div>
            ) : (
              renderCell(attrs, key)
            )}
          </td>
        ))}
        {role === 'admin' && (
          <td className="px-2 py-1.5 border text-center whitespace-nowrap">
            <button
              onClick={() => onEdit(item)}
              className="bg-gray-800 text-white text-xs px-2.5 py-1 rounded mr-2 hover:bg-gray-700"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(item)}
              className="bg-red-600 text-white text-xs px-2.5 py-1 rounded hover:bg-red-700"
            >
              Delete
            </button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="relative mt-6">
      {showRotateNotice && (
        <div className="bg-yellow-100 border-yellow-300 border px-3 py-2 rounded mb-3 text-yellow-800 text-xs text-center max-w-xl mx-auto">
          📱 For best experience, please rotate to landscape.
        </div>
      )}

      {/* No page-level horizontal scroll */}
      <div className="bg-white shadow-md rounded-lg overflow-x-hidden">
        <table className="w-full table-auto border-collapse text-sm">
          {/* Sticky header with compact spacing */}
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr>
              {visibleKeys.map((key) => (
                <th
                  key={key}
                  className="px-2 py-2 border text-left font-semibold text-gray-700 uppercase text-[11px] tracking-wide"
                >
                  {humanLabel(key)}
                </th>
              ))}
              {role === 'admin' && (
                <th className="px-2 py-2 border text-center font-semibold text-gray-700 uppercase text-[11px] tracking-wide">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {safeItems.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleKeys.length + (role === 'admin' ? 1 : 0)}
                  className="px-6 py-5 text-center text-gray-500 italic"
                >
                  No items to display.
                </td>
              </tr>
            ) : (
              safeItems.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center mt-3 space-x-3 text-sm text-gray-700">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="inline-block px-3 py-1">
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
