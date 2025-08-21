// src/components/InventoryTable.jsx
import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import Button from './ui/Button';
import { computeLowState } from '../utils/stockLogic';

const LABEL_OVERRIDES = {
  part_number: 'Part #',
  quantity: 'On Hand',
  on_hand: 'On Hand',
  qty_in_stock: 'On Hand',
  stock: 'On Hand',
  reorder_level: 'Reorder Level',
  reorder_qty: 'Reorder Qty',
  low_stock_threshold: 'Low-Stock Threshold',
  alert_enabled: 'Enable Low-Stock Alert',
  alert_acknowledged_at: 'Noted',
  barcode: 'Barcode',
  lead_times: 'Lead Time',
};

const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];
const NO_WRAP_COLS = new Set([
  'part_number',
  'alert_acknowledged_at',
  'barcode',
]);

const humanLabel = (k) =>
  LABEL_OVERRIDES[k] ||
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const isNumericLike = (k) =>
  QTY_KEYS.includes(k) ||
  /\b(level|qty|quantity|threshold|count|days|hours)\b/i.test(k);

const shouldNoWrap = (k) => NO_WRAP_COLS.has(k) || isNumericLike(k);

function formatShortDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function MobileCard({ item, onEdit, onDelete }) {
  const a = item.attributes || {};
  const { low } = computeLowState(a);
  const showAlert = a.alert_enabled !== false && low;
  const part = a.part_number || a.name || '—';
  const onHand = a.quantity ?? a.on_hand ?? a.qty_in_stock ?? a.stock ?? '—';

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-md p-4 mb-4">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <p className="font-bold text-lg text-slate-800">{part}</p>
          {a.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {a.description}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-medium text-slate-500">On Hand</p>
          <p className="font-bold text-2xl text-slate-800 tabular-nums">
            {onHand}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {[
          ['Type', a.type],
          ['Lead Time', a.lead_times],
          ['Reorder Lvl', a.reorder_level],
          ['Reorder Qty', a.reorder_qty],
          ['Barcode', a.barcode],
        ]
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => (
            <div key={k}>
              <p className="text-slate-500">{k}</p>
              <p className="font-medium text-slate-700">{String(v)}</p>
            </div>
          ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
        {showAlert && (
          <span className="text-xs font-bold text-red-600 mr-auto tracking-wider">
            LOW STOCK
          </span>
        )}
        <Button
          onClick={() => onEdit(item)}
          size="sm"
          variant="secondary"
          leftIcon={FiEdit2}
        >
          Edit
        </Button>
        <Button
          onClick={() => onDelete(item)}
          size="sm"
          variant="danger"
          leftIcon={FiTrash2}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function TabletRow({ item, expanded, onToggle, onEdit, onDelete }) {
  const a = item.attributes || {};
  const { low } = computeLowState(a);
  const showAlert = a.alert_enabled && low;
  const part = a.part_number || a.name || '—';
  const onHand = a.quantity ?? a.on_hand ?? a.qty_in_stock ?? a.stock ?? '—';
  const barcode = a.barcode || '—';

  return (
    <>
      <tr className={`${showAlert ? 'bg-red-50' : 'bg-white'} border-t`}>
        <td className="px-2 py-2 font-medium">
          {part}{' '}
          {showAlert && (
            <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
              Low
            </span>
          )}
        </td>
        <td className="px-2 py-2 text-center tabular-nums">{onHand}</td>
        <td className="px-2 py-2 text-center">{barcode}</td>
        <td className="px-2 py-2 text-right">
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50"
          >
            <FiMoreVertical className="opacity-70" />
            {expanded ? 'Hide' : 'Details'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white border-t">
          <td colSpan={4} className="px-3 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              {[
                ['Description', a.description],
                ['Type', a.type],
                ['Lead Time', a.lead_times],
                ['Reorder Lvl', a.reorder_level],
                ['Reorder Qty', a.reorder_qty],
                ['Noted', formatShortDate(a.alert_acknowledged_at)],
              ]
                .filter(([, v]) => v != null && v !== '')
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-800 text-right">
                      {String(v)}
                    </span>
                  </div>
                ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                onClick={() => onEdit(item)}
                size="sm"
                variant="outline"
                leftIcon={FiEdit2}
              >
                Edit
              </Button>
              <Button
                onClick={() => onDelete(item)}
                size="sm"
                variant="outline"
                className="text-rose-700"
                leftIcon={FiTrash2}
              >
                Delete
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function InventoryTable({
  items,
  columns = [],
  page,
  totalPages,
  onPage,
  onEdit,
  onDelete,
  role = 'viewer',
  rowsPerPage,
  onRowsPerPageChange,
  viewMode = 'desktop',
}) {
  const [showRotateNotice, setShowRotateNotice] = useState(false);

  // This effect now ONLY runs once to set up the listener
  useEffect(() => {
    const handleResize = () => {
      const isMobilePortrait =
        window.innerWidth < 768 && window.innerHeight > window.innerWidth;
      setShowRotateNotice(isMobilePortrait);
    };
    handleResize(); // Check on initial load
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // This new effect handles the auto-dismiss logic
  useEffect(() => {
    if (showRotateNotice) {
      const timer = setTimeout(() => {
        setShowRotateNotice(false);
      }, 5000); // Hide after 5 seconds

      // Clean up the timer if the component unmounts or the notice is hidden sooner
      return () => clearTimeout(timer);
    }
  }, [showRotateNotice]);

  const safeItems = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter((i) => i.attributes && typeof i.attributes === 'object')
        : [],
    [items],
  );

  const DesktopTable = () => (
    <div className="js-inventory-card overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="js-inventory-table w-full table-auto border-collapse text-sm">
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
            {columns.map((key) => (
              <th
                key={key}
                className="px-3 py-2.5 text-left uppercase tracking-wider text-slate-800 font-semibold text-[11px]"
              >
                {humanLabel(key)}
              </th>
            ))}
            {role === 'admin' && (
              <th
                className="
                  px-3 py-2.5 text-center uppercase tracking-wider
                  text-slate-800 font-semibold text-[11px] whitespace-nowrap
                  md:w-[168px]
                  md:sticky md:right-0
                  bg-gradient-to-b from-blue-50/80 to-white/95
                  backdrop-blur supports-[backdrop-filter]:bg-white/85
                  border-l border-slate-200
                  md:shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.08)]
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
                colSpan={columns.length + (role === 'admin' ? 1 : 0)}
                className="px-6 py-5 text-center text-gray-500 italic"
              >
                No items to display.
              </td>
            </tr>
          ) : (
            safeItems.map((item) => {
              const a = item.attributes || {};
              const { low } = computeLowState(a);
              const showAlert = a.alert_enabled !== false && low;
              return (
                <tr
                  key={item.id}
                  className={`border-t ${
                    showAlert ? 'bg-red-50' : 'bg-white'
                  } hover:bg-gray-50`}
                >
                  {columns.map((key) => {
                    const numeric = isNumericLike(key);
                    const value = a[key];
                    const cell =
                      key === 'alert_acknowledged_at' ? (
                        formatShortDate(value) || (
                          <span className="text-gray-400">—</span>
                        )
                      ) : value != null && value !== '' ? (
                        String(value)
                      ) : (
                        <span className="text-gray-400">—</span>
                      );

                    return (
                      <td
                        key={key}
                        className={`px-2 py-2 border align-middle text-[13px] ${
                          numeric ? 'text-center' : ''
                        }`}
                      >
                        <div
                          className={`${
                            numeric ? 'text-center' : 'text-left'
                          } ${
                            shouldNoWrap(key)
                              ? 'whitespace-nowrap'
                              : 'whitespace-normal break-words'
                          }`}
                        >
                          {cell}
                        </div>
                      </td>
                    );
                  })}

                  {role === 'admin' && (
                    <td className="px-2 md:px-3 py-2 border text-center whitespace-nowrap align-middle md:w-[168px] md:sticky md:right-0 md:bg-white md:shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.08)]">
                      <div className="w-full flex items-center justify-center gap-2">
                        <Button
                          onClick={() => onEdit(item)}
                          variant="ghost"
                          size="sm"
                          leftIcon={FiEdit2}
                          className="px-2 py-1"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => onDelete(item)}
                          variant="ghost"
                          size="sm"
                          leftIcon={FiTrash2}
                          className="px-2 py-1 text-rose-700 hover:text-rose-800"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const [expandedId, setExpandedId] = useState(null);
  const TabletTable = () => (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="w-full table-auto text-sm border-collapse">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase">
              Part #
            </th>
            <th className="px-3 py-2.5 text-center text-[12px] font-semibold uppercase">
              On Hand
            </th>
            <th className="px-3 py-2.5 text-center text-[12px] font-semibold uppercase">
              Barcode
            </th>
            <th className="px-3 py-2.5 text-right text-[12px] font-semibold uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {safeItems.map((it) => (
            <TabletRow
              key={it.id}
              item={it}
              expanded={expandedId === it.id}
              onToggle={() =>
                setExpandedId(expandedId === it.id ? null : it.id)
              }
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  const MobileCards = () => (
    <div>
      {safeItems.map((it) => (
        <MobileCard key={it.id} item={it} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );

  const Pager = () => (
    <div className="my-4 flex items-center justify-between gap-3 text-sm text-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-gray-600">Rows:</span>
        <select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
          className="h-8 border rounded px-2 bg-white"
        >
          {[8, 10, 12, 15, 20, 25, 30, 40, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1.5 border rounded disabled:opacity-50 bg-white hover:bg-gray-50"
        >
          Prev
        </button>
        <span className="tabular-nums">
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1.5 border rounded disabled:opacity-50 bg-white hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="mt-4 flex flex-col">
      {showRotateNotice && (
        <div className="bg-yellow-100 border-yellow-300 border px-3 py-2 rounded mb-3 text-yellow-800 text-xs text-center max-w-xl mx-auto transition-opacity duration-500">
          📱 For best experience, rotate to landscape.
        </div>
      )}

      {viewMode === 'mobile' ? (
        <MobileCards />
      ) : viewMode === 'tablet' ? (
        <TabletTable />
      ) : (
        <DesktopTable />
      )}

      <Pager />
    </div>
  );
}
