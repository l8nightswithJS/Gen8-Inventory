import { useMemo } from 'react';
import {
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiEdit2,
  FiPackage,
  FiPrinter,
  FiTrash2,
} from 'react-icons/fi';
import api from '../utils/axiosConfig';
import Button from './ui/Button';

const LABELS = {
  part_number: 'Part #',
  lot_number: 'Lot #',
  total_quantity: 'On Hand',
  initial_quantity: 'Initial Qty',
  uom: 'UOM',
  inventory_location: 'Location',
  barcode: 'Container Barcode',
  vendor_barcode: 'Vendor Barcode',
  container_status: 'Container',
  manufacturer_part_number: 'Mfg Material #',
  vendor_item_number: 'Vendor Item #',
  minimum_quantity: 'Minimum Qty',
  weekly_demand: 'Weekly Demand',
  reorder_quantity: 'Reorder Qty',
  target_quantity: 'Target Qty',
  weeks_on_hand: 'Weeks on Hand',
  suggested_reorder: 'Suggested Reorder',
  batch_number: 'Batch #',
  priority: 'Priority',
  status: 'Status',
};

const HIDDEN = new Set([
  'review_status',
  'review_issues',
  'reviewed_at',
  'inventory_record_count',
  'threshold_configured',
]);

const STATUS_LABELS = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  critical: 'Critical',
  out_of_stock: 'Out of Stock',
  needs_review: 'Needs Review',
};

const STATUS_CLASSES = {
  in_stock:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  low_stock:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  critical:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  out_of_stock:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  needs_review:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
};

const CONTAINER_LABELS = {
  available: 'Available',
  empty: 'Empty',
  hold: 'Hold',
  quarantine: 'Quarantine',
};

const isNumeric = (key) =>
  /\b(level|qty|quantity|threshold|count|weeks|demand|reorder|target|minimum|_id)\b/i.test(
    key,
  ) || ['total_quantity', 'initial_quantity'].includes(key);

const humanLabel = (key) =>
  LABELS[key] ||
  key.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

async function printContainerLabel(item) {
  try {
    const { data } = await api.post('/api/labels/print/selected', {
      item_ids: [item.id],
      client_id: item.client_id,
    });
    window.alert(data?.message || `Label ${item.barcode} sent to printer.`);
  } catch (requestError) {
    window.alert(
      requestError?.response?.data?.message ||
        'Could not print the container label. Confirm the Zebra printer connection is configured.',
    );
  }
}

function Badge({ status }) {
  const normalized = STATUS_LABELS[status] ? status : 'in_stock';
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASSES[normalized]}`}
    >
      {STATUS_LABELS[normalized]}
    </span>
  );
}

function SortHeader({ label, sortKey, onSort, sortConfig }) {
  const active = sortConfig.key === sortKey;
  return (
    <button
      className="flex items-center gap-1 whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active ? (
        sortConfig.direction === 'ascending' ? (
          <FiChevronUp />
        ) : (
          <FiChevronDown />
        )
      ) : null}
    </button>
  );
}

function MobileCard({
  item,
  role,
  onEdit,
  onDelete,
  onResolveReview,
  onRemaining,
  onHistory,
}) {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="min-w-0">
          <p className="break-words text-lg font-bold text-slate-900 dark:text-white">
            {item.part_number || item.name || item.description || '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {item.barcode || 'Barcode pending'}
          </p>
          {item.lot_number && (
            <p className="mt-1 text-sm text-slate-500">Lot: {item.lot_number}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge status={item.status} />
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {CONTAINER_LABELS[item.container_status] ||
                item.container_status ||
                'Available'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">On Hand</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {item.total_quantity ?? 0}
          </p>
          <p className="text-xs text-slate-500">{item.uom || ''}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        {[
          ['Name', item.name],
          ['Description', item.description],
          ['Location', item.inventory_location],
          ['Initial Qty', item.initial_quantity],
          ...Object.entries(item.attributes || {}),
        ]
          .filter(
            ([, value]) =>
              value !== null && value !== undefined && value !== '',
          )
          .map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-500">{humanLabel(label)}</p>
              <p className="break-words font-medium text-slate-700 dark:text-slate-300">
                {String(value)}
              </p>
            </div>
          ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => printContainerLabel(item)}
          leftIcon={FiPrinter}
        >
          Label
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRemaining?.(item)}
          leftIcon={FiPackage}
        >
          Remaining
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onHistory?.(item)}
          leftIcon={FiClock}
        >
          History
        </Button>
        {role === 'admin' && item.status === 'needs_review' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onResolveReview?.(item)}
            leftIcon={FiAlertTriangle}
          >
            Resolve
          </Button>
        )}
        {role === 'admin' && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit?.(item)}
              leftIcon={FiEdit2}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete?.(item)}
              leftIcon={FiTrash2}
            >
              Archive
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

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
  onRemaining,
  onHistory,
  role = 'viewer',
  rowsPerPage,
  onRowsPerPageChange,
  viewMode = 'desktop',
}) {
  const safeItems = useMemo(
    () => (Array.isArray(items) ? items : []),
    [items],
  );
  const visibleColumns = useMemo(
    () => columns.filter((key) => !HIDDEN.has(key)),
    [columns],
  );

  const cell = (item, key) => {
    if (key === 'status') return <Badge status={item.status} />;
    if (key === 'container_status') {
      return (
        CONTAINER_LABELS[item.container_status] ||
        item.container_status ||
        'Available'
      );
    }
    const value = item[key] ?? item.attributes?.[key];
    return value === null || value === undefined || value === ''
      ? '—'
      : String(value);
  };

  const desktop = (
    <div className="relative w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <tr>
            {visibleColumns.map((key, index) => (
              <th
                key={key}
                className={`whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 ${
                  isNumeric(key) ? 'text-right' : 'text-left'
                } ${
                  index === 0
                    ? 'sticky left-0 z-20 bg-slate-50 shadow-[2px_0_0_rgba(148,163,184,0.15)] dark:bg-slate-900'
                    : ''
                }`}
              >
                <SortHeader
                  label={humanLabel(key)}
                  sortKey={key}
                  onSort={onSort}
                  sortConfig={sortConfig}
                />
              </th>
            ))}
            <th className="sticky right-0 z-20 min-w-[225px] bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase text-slate-600 shadow-[-2px_0_0_rgba(148,163,184,0.15)] dark:bg-slate-900 dark:text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {safeItems.length === 0 ? (
            <tr>
              <td
                colSpan={visibleColumns.length + 1}
                className="px-6 py-6 text-center italic text-slate-500"
              >
                No items to display.
              </td>
            </tr>
          ) : (
            safeItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                {visibleColumns.map((key, index) => (
                  <td
                    key={key}
                    className={`max-w-[260px] whitespace-nowrap px-3 py-3 text-slate-700 dark:text-slate-300 ${
                      isNumeric(key) ? 'text-right tabular-nums' : 'text-left'
                    } ${
                      index === 0
                        ? 'sticky left-0 z-10 bg-white font-medium shadow-[2px_0_0_rgba(148,163,184,0.12)] dark:bg-slate-900'
                        : ''
                    }`}
                  >
                    <div
                      className={
                        index === 0 ? 'max-w-[220px] truncate' : 'max-w-[250px] truncate'
                      }
                    >
                      {cell(item, key)}
                    </div>
                  </td>
                ))}
                <td className="sticky right-0 z-10 bg-white px-2 py-2 shadow-[-2px_0_0_rgba(148,163,184,0.12)] dark:bg-slate-900">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Print container label"
                      onClick={() => printContainerLabel(item)}
                    >
                      <FiPrinter size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Update remaining quantity"
                      onClick={() => onRemaining?.(item)}
                    >
                      <FiPackage size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Movement history"
                      onClick={() => onHistory?.(item)}
                    >
                      <FiClock size={16} />
                    </Button>
                    {role === 'admin' && item.status === 'needs_review' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Resolve review"
                        onClick={() => onResolveReview?.(item)}
                        className="text-violet-600"
                      >
                        <FiAlertTriangle size={16} />
                      </Button>
                    )}
                    {role === 'admin' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={() => onEdit?.(item)}
                        >
                          <FiEdit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Archive"
                          onClick={() => onDelete?.(item)}
                          className="text-rose-600"
                        >
                          <FiTrash2 size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const mobile = (
    <div>
      {safeItems.map((item) => (
        <MobileCard
          key={item.id}
          item={item}
          role={role}
          onEdit={onEdit}
          onDelete={onDelete}
          onResolveReview={onResolveReview}
          onRemaining={onRemaining}
          onHistory={onHistory}
        />
      ))}
    </div>
  );

  return (
    <div className="mt-4 min-w-0">
      {viewMode === 'mobile' ? mobile : desktop}
      <div className="my-4 flex flex-col items-center gap-3 text-sm text-slate-700 dark:text-slate-300 sm:flex-row sm:justify-between">
        <div className="font-medium">
          Total containers: <span className="font-bold">{totalItems}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            Rows
            <select
              value={rowsPerPage}
              onChange={(event) =>
                onRowsPerPageChange?.(Number(event.target.value))
              }
              className="h-8 rounded border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-800"
            >
              {[15, 25, 50, 100].map((number) => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              className="rounded border px-3 py-1.5 disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPage(page + 1)}
              className="rounded border px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
