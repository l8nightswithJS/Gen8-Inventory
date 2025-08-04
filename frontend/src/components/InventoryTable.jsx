// src/components/InventoryTable.jsx
import React, { useEffect, useState } from 'react';

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
    const check = () => setShowRotateNotice(window.innerWidth < 775);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const safeItems = Array.isArray(items)
    ? items.filter((i) => i.attributes && typeof i.attributes === 'object')
    : [];

  const attributeKeys = Array.from(
    new Set(safeItems.flatMap((i) => Object.keys(i.attributes || {}))),
  ).sort();

  return (
    <div className="relative mt-6">
      {showRotateNotice && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded mb-4 text-sm text-center max-w-xl mx-auto">
          📱 For best experience, please rotate to landscape.
        </div>
      )}

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full text-sm table-auto border-collapse">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              {attributeKeys.map((key) => (
                <th key={key} className="px-4 py-3 border capitalize">
                  {key}
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
              safeItems.map((item) => {
                const isLow =
                  item.attributes?.alert_enabled &&
                  item.attributes?.quantity <
                    item.attributes?.low_stock_threshold;

                return (
                  <tr
                    key={item.id}
                    className={`border-t hover:bg-gray-50 ${
                      isLow ? 'bg-red-50' : ''
                    }`}
                  >
                    {attributeKeys.map((key) => (
                      <td key={key} className="px-4 py-2 border">
                        {item.attributes?.[key] !== undefined ? (
                          String(item.attributes[key])
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
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
              })
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
