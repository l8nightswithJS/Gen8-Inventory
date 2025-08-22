// src/components/InventoryTable.jsx
import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import Button from './ui/Button';
import { computeLowState } from '../utils/stockLogic';

const LABEL_OVERRIDES = {
  part_number: 'Part #',
  name: 'Name',
  description: 'Description',
  quantity: 'On Hand',
  on_hand: 'On Hand',
  qty_in_stock: 'On Hand',
  stock: 'On Hand',
  reorder_level: 'Reorder Lvl',
  reorder_qty: 'Reorder Qty',
  low_stock_threshold: 'Low-Stock Threshold',
  alert_enabled: 'Enable Low-Stock Alert',
  alert_acknowledged_at: 'Noted',
  barcode: 'Barcode',
  lead_times: 'Lead Time',
};

const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];

const humanLabel = (k) =>
  LABEL_OVERRIDES[k] ||
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const isNumericLike = (k) =>
  QTY_KEYS.includes(k) ||
  /\b(level|qty|quantity|threshold|count|days|hours)\b/i.test(k);

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

const SortableHeader = ({
  children,
  sortKey,
  onSort,
  sortConfig,
  className,
}) => {
  const isSorted = sortConfig.key === sortKey;
  const isAsc = sortConfig.direction === 'ascending';
  return (
    <button
      className={`flex items-center gap-1 group ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span>{children}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {isSorted ? (
          isAsc ? (
            <FiChevronUp size={14} />
          ) : (
            <FiChevronDown size={14} />
          )
        ) : (
          <FiChevronUp size={14} className="text-slate-400" />
        )}
      </span>
    </button>
  );
};

export default function InventoryTable({
  items,
  totalItems,
  columns = [],
  sortConfig,
  onSort,
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

  useEffect(() => {
    const handleResize = () => {
      const isMobilePortrait =
        window.innerWidth < 768 && window.innerHeight > window.innerWidth;
      setShowRotateNotice(isMobilePortrait);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (showRotateNotice) {
      const timer = setTimeout(() => {
        setShowRotateNotice(false);
      }, 5000);
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

  const ResponsiveTable = () => (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="w-full table-auto border-collapse text-sm">
        {/* Changed bg-slate-50 to bg-white to make the table pop */}
        <thead className="bg-white border-b border-slate-200">
          <tr>
            {columns.map((key) => (
              <th
                key={key}
                className={`px-4 py-3 text-[12px] font-semibold uppercase text-slate-600 ${
                  isNumericLike(key) ? 'text-right' : 'text-left'
                }`}
              >
                <SortableHeader
                  sortKey={key}
                  onSort={onSort}
                  sortConfig={sortConfig}
                  className={isNumericLike(key) ? 'ml-auto' : ''}
                >
                  {humanLabel(key)}
                </SortableHeader>
              </th>
            ))}
            {role === 'admin' && (
              <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase text-slate-600 w-28">
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
                  className="border-b last:border-b-0 hover:bg-slate-50 transition-colors"
                >
                  {columns.map((key, index) => {
                    const value = a[key];
                    const isNumeric = isNumericLike(key);
                    const isPrimaryColumn =
                      index === 0 && (key === 'part_number' || key === 'name');

                    let cellContent =
                      value != null && value !== '' ? (
                        String(value)
                      ) : (
                        <span className="text-gray-400">—</span>
                      );

                    if (key === 'on_hand') {
                      cellContent = (
                        <div className="flex items-center justify-end gap-2">
                          {showAlert && (
                            <div
                              className="h-2 w-2 rounded-full bg-red-500"
                              title="Low Stock"
                            ></div>
                          )}
                          <span>{cellContent}</span>
                        </div>
                      );
                    }

                    return (
                      <td
                        key={key}
                        className={`px-4 py-3 align-top text-sm ${
                          isNumeric ? 'text-right tabular-nums' : 'text-left'
                        }`}
                      >
                        {isPrimaryColumn ? (
                          <div>
                            <p className="font-semibold text-slate-800">
                              {cellContent}
                            </p>
                            {a.description && (
                              <p className="text-xs text-slate-500 mt-1">
                                {a.description}
                              </p>
                            )}
                          </div>
                        ) : (
                          cellContent
                        )}
                      </td>
                    );
                  })}

                  {role === 'admin' && (
                    <td className="px-4 py-3 align-top text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          onClick={() => onEdit(item)}
                          variant="ghost"
                          size="sm"
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </Button>
                        <Button
                          onClick={() => onDelete(item)}
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
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

  const MobileCards = () => (
    <div>
      {safeItems.map((it) => (
        <MobileCard key={it.id} item={it} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );

  const Pager = () => (
    <div className="my-4 flex flex-col sm:flex-row items-center sm:justify-between gap-3 text-sm text-gray-700">
      <div className="font-medium">
        Total items: <span className="font-bold">{totalItems}</span>
      </div>
      <div className="flex items-center gap-4">
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
    </div>
  );

  return (
    <div className="mt-4 flex flex-col">
      {showRotateNotice && (
        <div className="bg-yellow-100 border-yellow-300 border px-3 py-2 rounded mb-3 text-yellow-800 text-xs text-center max-w-xl mx-auto transition-opacity duration-500">
          📱 For best experience, rotate to landscape.
        </div>
      )}

      {viewMode === 'mobile' ? <MobileCards /> : <ResponsiveTable />}

      <Pager />
    </div>
  );
}
