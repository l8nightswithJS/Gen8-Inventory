import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function InventoryTable({
  items,
  refresh,
  role = 'viewer',
  page,
  totalPages,
  onPage,
  onEdit,      // ← callback for editing
}) {
  const [showRotateNotice, setShowRotateNotice] = useState(false);

  useEffect(() => {
    const checkWidth = () => setShowRotateNotice(window.innerWidth < 775);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) return console.error('Delete failed:', error);
    refresh();
  };

  const attributeKeys = Array.from(
    new Set(items.flatMap(i => Object.keys(i.attributes || {})))
  );

  return (
    <div className="relative mt-6">
      {showRotateNotice && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded mb-4 text-sm text-center max-w-xl mx-auto">
          📱 For better viewing, please rotate to landscape.
        </div>
      )}

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full text-sm table-auto border-collapse">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 border">Name</th>
              <th className="px-4 py-3 border">Part #</th>
              <th className="px-4 py-3 border">Description</th>
              <th className="px-2 py-3 border text-center">Qty</th>
              <th className="px-2 py-3 border text-center">Location</th>
              <th className="px-2 py-3 border text-center">Lot #</th>
              {attributeKeys.map(key => (
                <th key={key} className="px-4 py-3 border capitalize">{key}</th>
              ))}
              {role === 'admin' && <th className="px-4 py-3 border text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6 + attributeKeys.length + (role === 'admin' ? 1 : 0)}
                  className="px-6 py-5 text-center text-gray-500 italic"
                >
                  No items to display.
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 border">{item.name}</td>
                  <td className="px-4 py-2 border whitespace-pre-line">{item.part_number}</td>
                  <td className="px-4 py-2 border whitespace-pre-wrap">{item.description}</td>
                  <td className="px-2 py-2 border text-center">{item.quantity}</td>
                  <td className="px-2 py-2 border text-center">{item.location}</td>
                  <td className="px-2 py-2 border text-center italic text-gray-400">
                    {item.has_lot ? item.lot_number || '—' : 'Disabled'}
                  </td>
                  {attributeKeys.map(key => (
                    <td key={key} className="px-4 py-2 border">
                      {item.attributes?.[key] ?? <span className="text-gray-400">—</span>}
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
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex justify-center mt-4 space-x-4 text-sm text-gray-700">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
        >
          Prev
        </button>
        <span className="py-1">Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
        >
          Next
        </button>
      </div>
    </div>
  );
}
