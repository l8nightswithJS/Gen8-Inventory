// src/components/InventoryTable.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
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
  'alert_acknowledged_at',
  'barcode',
];

const LABEL_OVERRIDES = {
  part_number: 'Part #',
  quantity: 'On Hand',
  reorder_level: 'Reorder Level',
  reorder_qty: 'Reorder Qty',
  low_stock_threshold: 'Low-Stock Threshold',
  alert_enabled: 'Enable Low-Stock Alert',
  alert_acknowledged_at: 'Noted',
  barcode: 'Barcode',
};

const HIDE_FORCE = new Set(['alert_enabled', 'has_lot', 'low_stock_threshold']);
const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];

// columns that should not wrap (always single line)
const NO_WRAP_COLS = new Set([
  'part_number',
  'alert_acknowledged_at',
  'barcode',
]);

const humanLabel = (k) =>
  LABEL_OVERRIDES[k] ||
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function isNumericLike(key, qtyKey) {
  if (key === qtyKey) return true;
  if (QTY_KEYS.includes(key)) return true;
  return /\b(level|qty|quantity|threshold|count|days|hours)\b/i.test(key);
}

function shouldNoWrap(key, qtyKey) {
  return NO_WRAP_COLS.has(key) || isNumericLike(key, qtyKey);
}

// Short, locale-aware date for “Noted”
function formatShortDate(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

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
    const f = () => setShowRotateNotice(window.innerWidth < 775);
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
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
      new Set(safeItems.flatMap((i) => Object.keys(i.attributes))),
    );
    return keys.sort((a, b) => {
      const ia = LEGACY_ORDER.indexOf(a),
        ib = LEGACY_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [safeItems]);

  const qtyKey = useMemo(
    () => QTY_KEYS.find((k) => allKeys.includes(k)),
    [allKeys],
  );

  const visibleKeys = useMemo(
    () =>
      allKeys
        .filter((k) => !HIDE_FORCE.has(k))
        .filter((k) => (qtyKey ? k === qtyKey || !QTY_KEYS.includes(k) : true)),
    [allKeys, qtyKey],
  );

  const renderCell = (attrs, key) => {
    const value = attrs[key];

    // special formatting for "Noted"
    if (key === 'alert_acknowledged_at') {
      const short = formatShortDate(value);
      return short ? (
        <div
          className="leading-tight text-left whitespace-nowrap"
          title={String(value)}
        >
          {short}
        </div>
      ) : (
        <span className="text-gray-400">—</span>
      );
    }

    const numeric = isNumericLike(key, qtyKey);
    const nowrap = shouldNoWrap(key, qtyKey);

    return value != null ? (
      <div
        className={`leading-tight ${numeric ? 'text-center' : 'text-left'} ${
          nowrap ? 'whitespace-nowrap' : 'whitespace-normal break-words'
        }`}
        title={String(value)}
      >
        {String(value)}
      </div>
    ) : (
      <span className="text-gray-400">—</span>
    );
  };

  // Buttons (original look)
  const btnBase =
    'inline-flex items-center justify-center rounded-md border transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-0 ' +
    'text-[11px] md:text-xs px-1.5 md:px-2.5 py-1 gap-1 md:gap-1.5';
  const btnEdit =
    'border-blue-200 text-blue-700 bg-white hover:bg-blue-50 focus:ring-blue-300';
  const btnDelete =
    'border-red-200 text-red-700 bg-white hover:bg-red-50 focus:ring-red-300';

  const renderRow = (item) => {
    const attrs = item.attributes || {};
    const { low } = computeLowState(attrs);

    return (
      <tr
        key={item.id}
        className={`border-t ${
          low ? 'bg-red-50' : 'bg-white'
        } hover:bg-gray-50`}
      >
        {visibleKeys.map((key, idx) => {
          const numeric = isNumericLike(key, qtyKey);
          const isAck = key === 'alert_acknowledged_at';
          const isBarcode = key === 'barcode';

          // Fixed widths at md+ keep desktop alignment; mobile remains flexible
          const widthClasses = [
            numeric ? 'md:w-[84px] md:whitespace-nowrap' : '',
            isAck ? 'md:w-[128px] md:whitespace-nowrap' : '',
            isBarcode ? 'md:w-[120px] md:whitespace-nowrap' : '',
          ].join(' ');

          return (
            <td
              key={key}
              className={`px-2 py-1.5 border align-middle text-[13px] ${
                numeric ? 'text-center' : ''
              } ${widthClasses}`}
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
          );
        })}

        {role === 'admin' && (
          <td
            className="
              px-2 md:px-3 py-1.5 border text-center whitespace-nowrap align-middle
              md:w-[152px]
              overflow-hidden
            "
          >
            <div className="w-full flex items-center justify-center gap-1.5 md:gap-2">
              <button
                onClick={() => onEdit(item)}
                className={`${btnBase} ${btnEdit}`}
                title="Edit item"
              >
                <FiEdit2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Edit</span>
              </button>
              <button
                onClick={() => onDelete(item)}
                className={`${btnBase} ${btnDelete}`}
                title="Delete item"
              >
                <FiTrash2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Delete</span>
              </button>
            </div>
          </td>
        )}
      </tr>
    );
  };

  const Pager = () => (
    <div className="flex items-center justify-end gap-2 text-sm text-gray-700">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Prev
      </button>
      <span>
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
  );

  return (
    <div className="mt-4 flex h-full min-h-0 flex-col">
      {showRotateNotice && (
        <div className="bg-yellow-100 border-yellow-300 border px-3 py-2 rounded mb-3 text-yellow-800 text-xs text-center max-w-xl mx-auto">
          📱 For best experience, please rotate to landscape.
        </div>
      )}

      {/* horizontal scroll on very small screens; preserves your original styling */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-white shadow-md rounded-lg pr-1">
        <table className="w-full table-auto border-collapse text-sm">
          <thead
            className="
              sticky top-0 z-10
              bg-gradient-to-b from-blue-50/80 to-white/95
              backdrop-blur supports-[backdrop-filter]:bg-white/85
              border-b border-slate-200
              shadow-[0_1px_0_rgba(0,0,0,0.05)]
            "
          >
            <tr>
              {visibleKeys.map((key) => {
                const numeric = isNumericLike(key, qtyKey);
                const isAck = key === 'alert_acknowledged_at';
                const isBarcode = key === 'barcode';
                const noWrap = shouldNoWrap(key, qtyKey);

                const widthClasses = [
                  numeric ? 'md:w-[84px] md:whitespace-nowrap' : '',
                  isAck ? 'md:w-[128px] md:whitespace-nowrap' : '',
                  isBarcode ? 'md:w-[120px] md:whitespace-nowrap' : '',
                ].join(' ');

                return (
                  <th
                    key={key}
                    className={`px-3 py-2.5 text-left uppercase tracking-wider text-slate-700 font-semibold text-[11px]
                      ${numeric ? 'md:text-center' : ''} ${widthClasses} ${
                      noWrap ? 'whitespace-nowrap' : 'whitespace-normal'
                    }`}
                  >
                    {humanLabel(key === qtyKey ? 'quantity' : key)}
                  </th>
                );
              })}
              {role === 'admin' && (
                <th
                  className="
                    px-3 py-2.5 text-center uppercase tracking-wider
                    text-slate-700 font-semibold text-[11px] whitespace-nowrap
                    md:w-[152px]
                  "
                >
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

      <div className="mt-3">
        <Pager />
      </div>
    </div>
  );
}
