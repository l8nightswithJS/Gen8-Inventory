import { useMemo } from 'react';
import {
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import Button from './ui/Button';

const LABEL_OVERRIDES = {
  part_number: 'Part #',
  lot_number: 'Lot #',
  name: 'Name',
  description: 'Description',
  total_quantity: 'On Hand',
  uom: 'UOM',
  inventory_location: 'Location',
  barcode: 'Internal Barcode',
  vendor_barcode: 'Vendor Barcode',
  reorder_level: 'Reorder Level',
  low_stock_threshold: 'Low-Stock Threshold',
  status: 'Status',
};

const HIDDEN_OPERATIONAL_COLUMNS = new Set([
  'review_status',
  'review_issues',
  'reviewed_at',
  'inventory_record_count',
  'threshold_configured',
]);

const STATUS_LABELS = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  needs_review: 'Needs Review',
};

const STATUS_CLASSES = {
  in_stock:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  low_stock:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  out_of_stock: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  needs_review:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const isNumericLike = (key) =>
  /\b(level|qty|quantity|threshold|count|days|hours|_id)\b/i.test(key) ||
  key === 'total_quantity';

const humanLabel = (key) =>
  LABEL_OVERRIDES[key] ||
  key.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

function StatusBadge({ status }) {
  const normalized = STATUS_LABELS[status] ? status : 'in_stock';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASSES[normalized]}`}
    >
      {STATUS_LABELS[normalized]}
    </span>
  );
}

function MobileCard({ item, onEdit, onDelete, onResolveReview, role }) {
  const part = item.part_number || item.name || '—';
  const onHand = item.total_quantity ?? '—';
  const reviewIssues = Array.isArray(item.review_issues)
    ? item.review_issues
    : [];

  const details = [
    ['Name', item.name],
    ['Description', item.description],
    ['Location', item.inventory_location],
    ['Reorder Level', item.reorder_level],
    ['Internal Barcode', item.barcode],
    ['Vendor Barcode', item.vendor_barcode],
    ...Object.entries(item.attributes || {}),
  ].filter(([, value]) => value != null && value !== '');

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
          <div className="mt-2">
            <StatusBadge status={item.status} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            On Hand
          </p>
          <p className="font-bold text-2xl text-slate-800 dark:text-white tabular-nums">
            {onHand}
          </p>
          {item.uom && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {item.uom}
            </p>
          )}
        </div>
      </div>

      {item.status === 'needs_review' && reviewIssues.length > 0 && (
        <div className="mt-4 rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 dark:border-orange-500/30 dark:bg-orange-900/20 dark:text-orange-200">
          <div className="flex items-center gap-2 font-semibold">
            <FiAlertTriangle /> Inventory data needs review
          </div>
          <p className="mt-1">
            {reviewIssues[0]?.message || 'Imported data requires review.'}
          </p>
          {reviewIssues.length > 1 && (
            <p className="mt-1 text-xs">+{reviewIssues.length - 1} more issue(s)</p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {details.map(([key, value]) => (
          <div key={key}>
            <p className="text-slate-500 dark:text-slate-400">
              {humanLabel(key)}
            </p>
            <p className="font-medium text-slate-700 dark:text-slate-300 break-words">
              {String(value)}
            </p>
          </div>
        ))}
      </div>

      {role === 'admin' && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
          {item.status === 'needs_review' && (
            <Button
              onClick={() => onResolveReview?.(item)}
              size="sm"
              variant="secondary"
              leftIcon={FiAlertTriangle}
            >
              Resolve
            </Button>
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
      )}
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
  const isAscending = sortConfig.direction === 'ascending';

  return (
    <button
      className={`flex items-center gap-1 group ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span>{children}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {isSorted ? (
          isAscending ? (
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
  onResolveReview,
  role = 'viewer',
  rowsPerPage,
  onRowsPerPageChange,
  viewMode = 'desktop',
}) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const visibleColumns = useMemo(
    () => columns.filter((key) => !HIDDEN_OPERATIONAL_COLUMNS.has(key)),
    [columns],
  );

  const renderCellValue = (item, key) => {
    if (key === 'status') return <StatusBadge status={item.status} />;

    const value = item[key] ?? item.attributes?.[key];
    if (value == null || value === '') {
      return <span className="text-gray-400 dark:text-gray-500">—</span>;
    }

    return String(value);
  };

  const ResponsiveTable = () => (
    <div className="overflow-x-auto bg-white dark:bg-slate-900 shadow-md rounded-lg">
      <table className="w-full table-auto border-collapse text-sm">
        <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <tr>
            {visibleColumns.map((key) => (
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
                className="px-4 py-3 text-center text-[12px] font-semibold uppercase text-slate-600 dark:text-slate-400 w-32"
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
                colSpan={visibleColumns.length + (role === 'admin' ? 1 : 0)}
                className="px-6 py-5 text-center text-gray-500 dark:text-gray-400 italic"
              >
                No items to display.
              </td>
            </tr>
          ) : (
            safeItems.map((item) => (
              <tr
                key={item.id}
                className="border-b last:border-b-0 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {visibleColumns.map((key) => {
                  const isNumeric = isNumericLike(key);
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
                          justifyContent: isNumeric ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {key === 'total_quantity' &&
                          item.status === 'low_stock' && (
                            <div
                              className="h-2 w-2 rounded-full bg-amber-500"
                              title="Low Stock"
                            />
                          )}
                        {key === 'total_quantity' &&
                          item.status === 'out_of_stock' && (
                            <div
                              className="h-2 w-2 rounded-full bg-red-500"
                              title="Out of Stock"
                            />
                          )}
                        <span>{renderCellValue(item, key)}</span>
                      </div>
                    </td>
                  );
                })}

                {role === 'admin' && (
                  <td className="px-4 py-3 align-top text-center w-32">
                    <div className="flex items-center justify-center gap-1">
                      {item.status === 'needs_review' && (
                        <Button
                          onClick={() => onResolveReview?.(item)}
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700"
                          title="Resolve inventory review"
                        >
                          <FiAlertTriangle size={16} />
                        </Button>
                      )}
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
            ))
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
        safeItems.map((item) => (
          <MobileCard
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onResolveReview={onResolveReview}
            role={role}
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
            onChange={(event) =>
              onRowsPerPageChange?.(Number(event.target.value))
            }
            className="h-8 border rounded px-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
          >
            {[15, 25, 50, 100].map((number) => (
              <option key={number} value={number}>
                {number}
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
