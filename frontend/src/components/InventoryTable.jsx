// src/components/InventoryTable.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { computeLowState } from '../utils/stockLogic';

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

// Columns hidden in read-only grid (but still editable in modal)
const HIDE_FORCE = new Set(['alert_enabled', 'has_lot', 'low_stock_threshold']);

// auto-hide pure boolean columns
const looksBooleanColumn = (key, rows) =>
  rows.every((it) => {
    const v = it.attributes?.[key];
    return (
      v === undefined ||
      v === null ||
      typeof v === 'boolean' ||
      (typeof v === 'string' && /^(true|false)$/i.test(v))
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

  const visibleKeys = useMemo(
    () =>
      allKeys.filter(
        (k) => !HIDE_FORCE.has(k) && !looksBooleanColumn(k, safeItems),
      ),
    [allKeys, safeItems],
  );

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
    const { low } = computeLowState(attrs);

    return (
      <tr
        key={item.id}
        className={`border-t hover:bg-gray-50 ${
          low ? 'bg-red-50' : 'bg-white'
        }`}
      >
        {visibleKeys.map((key, idx) => (
          <td
            key={key}
            className="px-2 py-1.5 border align-middle text-sm md:text-[13px] whitespace-normal break-words"
          >
            {idx === 0 && low ? (
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

      {/* Sticky header inside its own vertical scroll area */}
      <div className="bg-white shadow-md rounded-lg overflow-x-hidden">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full table-auto border-collapse text-sm">
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
