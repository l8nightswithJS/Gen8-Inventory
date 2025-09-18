// frontend/src/components/InventoryTable.jsx
import { useMemo } from 'react';
import { FiEdit2, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import Button from './ui/Button';

const LABEL_OVERRIDES = {
  part_number: 'Part #',
  lot_number: 'Lot #',
  name: 'Name',
  description: 'Description',
  total_quantity: 'On Hand',
  reorder_level: 'Reorder Lvl',
  low_stock_threshold: 'Low-Stock Threshold',
};

const isNumericLike = (k) =>
  /\b(level|qty|quantity|threshold|count|days|hours|_id)\b/i.test(k) ||
  k === 'total_quantity';

const humanLabel = (k) =>
  LABEL_OVERRIDES[k] ||
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function MobileCard({ item, onEdit, onDelete }) {
  const part = item.part_number || item.name || '—';
  const onHand = item.total_quantity ?? '—';
  const isLow = item.total_quantity <= item.reorder_level && item.alert_enabled;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md p-4 mb-4">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <p className="font-bold text-lg text-slate-800 dark:text-white">
            {part}
          </p>
          {item.lot_number && (
            <p className="text-sm font-mono text-slate-500 dark:text-slate-400">
              Lot: {item.lot_number}
            </p>
          )}
          {item.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            On Hand
          </p>
          <p className="font-bold text-2xl text-slate-800 dark:text-white tabular-nums">
            {onHand}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {[
          ['Reorder Lvl', item.reorder_level],
          ['Barcode', item.barcode],
          ...Object.entries(item.attributes || {}),
        ]
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => (
            <div key={k}>
              <p className="text-slate-500 dark:text-slate-400">
                {humanLabel(k)}
              </p>
              <p className="font-medium text-slate-700 dark:text-slate-300">
                {String(v)}
              </p>
            </div>
          ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
        {isLow && (
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
  sortConfig = { key: null, direction: 'ascending' },
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
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const ResponsiveTable = () => (
    <div className="overflow-x-auto bg-white dark:bg-slate-900 shadow-md rounded-lg">
      <table className="w-full table-auto border-collapse text-sm">
        <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <tr>
            {columns.map((key) => (
              <th
                key={key}
                scope="col"
                className={`px-4 py-3 text-[12px] font-semibold uppercase text-slate-600 dark:text-slate-400 ${
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
              <th
                scope="col"
                className="px-4 py-3 text-center text-[12px] font-semibold uppercase text-slate-600 dark:text-slate-400 w-28"
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
                className="px-6 py-5 text-center text-gray-500 dark:text-gray-400 italic"
              >
                No items to display.
              </td>
            </tr>
          ) : (
            safeItems.map((item) => {
              const isLow =
                item.total_quantity <= item.reorder_level && item.alert_enabled;
              return (
                <tr
                  key={item.id}
                  className="border-b last:border-b-0 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {columns.map((key) => {
                    const value = item[key] ?? item.attributes?.[key];
                    const isNumeric = isNumericLike(key);

                    const cellContent =
                      value != null && value !== '' ? (
                        String(value)
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          —
                        </span>
                      );

                    return (
                      <td
                        key={key}
                        className={`px-4 py-3 align-top text-sm text-slate-700 dark:text-slate-300 ${
                          isNumeric ? 'text-right tabular-nums' : 'text-left'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2"
                          style={{
                            justifyContent: isNumeric
                              ? 'flex-end'
                              : 'flex-start',
                          }}
                        >
                          {key === 'total_quantity' && isLow && (
                            <div
                              className="h-2 w-2 rounded-full bg-red-500"
                              title="Low Stock"
                            ></div>
                          )}
                          <span>{cellContent}</span>
                        </div>
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
      {safeItems.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 italic mt-4">
          No items to display.
        </p>
      ) : (
        safeItems.map((it) => (
          <MobileCard
            key={it.id}
            item={it}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );

  const Pager = () => (
    <div className="my-4 flex flex-col sm:flex-row items-center sm:justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">
      <div className="font-medium">
        Total items: <span className="font-bold">{totalItems}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Rows:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
            className="h-8 border rounded px-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
          >
            {[15, 25, 50, 100].map((n) => (
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
            className="px-3 py-1.5 border rounded disabled:opacity-50 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700"
          >
            Prev
          </button>
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            className="px-3 py-1.5 border rounded disabled:opacity-50 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-4 flex flex-col">
      {viewMode === 'mobile' ? <MobileCards /> : <ResponsiveTable />}
      <Pager />
    </div>
  );
}
