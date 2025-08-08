// src/components/InventoryTable.jsx
import React, { useEffect, useState, useMemo } from 'react';

const LEGACY_ORDER = [
  'name',
  'part_number',
  'description',
  'quantity',
  'location',
  'has_lot',
  'lot_number',
  'low_stock_threshold',
  'alert_enabled',
];

const LABEL_OVERRIDES = {
  alert_enabled: 'Enable Low-Stock Alert',
  low_stock_threshold: 'Low-Stock Threshold',
  part_number: 'Part #',
  quantity: 'On Hand',
};

const humanLabel = (key) =>
  LABEL_OVERRIDES[key] ||
  key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

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

  const attributeKeys = useMemo(() => {
    const allKeys = Array.from(
      new Set(safeItems.flatMap((item) => Object.keys(item.attributes))),
    );
    return allKeys.sort((a, b) => {
      const ia = LEGACY_ORDER.indexOf(a);
      const ib = LEGACY_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [safeItems]);

  const renderCell = (attrs, key) => {
    const value = attrs[key];
    return value != null ? (
      String(value)
    ) : (
      <span className="text-gray-400">—</span>
    );
  };

  const renderRow = (item) => {
    const attrs = item.attributes;
    const isLow =
      attrs.alert_enabled &&
      Number(attrs.quantity) < Number(attrs.low_stock_threshold);

    return (
      <tr
        key={item.id}
        className={`border-t hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}
      >
        {attributeKeys.map((key) => (
          <td key={key} className="px-4 py-2 border">
            {renderCell(attrs, key)}
          </td>
        ))}
        {role === 'admin' && (
          <td className="px-4 py-2 border text-center whitespace-nowrap">
            <button
              onClick={() => onEdit(item)}
              className="bg-gray-800 text-white text-xs px-3 py-1 rounded mr-2 hover:bg-gray-700"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(item)}
              className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700"
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
        <div className="bg-yellow-100 border-yellow-300 border px-4 py-3 rounded mb-4 text-yellow-800 text-sm text-center max-w-xl mx-auto">
          📱 For best experience, please rotate to landscape.
        </div>
      )}

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full table-auto border-collapse text-sm">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              {attributeKeys.map((key) => (
                <th key={key} className="px-4 py-3 border">
                  {humanLabel(key)}
                </th>
              ))}
              {role === 'admin' && (
                <th className="px-4 py-3 border text-center">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {safeItems.length === 0 ? (
              <tr>
                <td
                  colSpan={attributeKeys.length + (role === 'admin' ? 1 : 0)}
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

      <div className="flex justify-center mt-4 space-x-4 text-sm text-gray-700">
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
