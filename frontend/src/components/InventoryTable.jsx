import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function InventoryTable({ items, refresh, role = 'viewer', page, totalPages, onPage }) {
  const navigate = useNavigate();

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      await fetch(`http://localhost:8000/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (refresh) refresh();
    }
  };

  // Dynamically gather unique attribute keys across all items
  const attributeKeys = Array.from(
    new Set(items.flatMap(item => Object.keys(item.attributes || {})))
  );

  return (
    <div className="overflow-x-auto mt-6">
      <table className="w-full border text-left shadow-md rounded">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Part #</th>
            <th className="p-2 border">Description</th>
            <th className="p-2 border">Qty</th>
            <th className="p-2 border">Location</th>
            <th className="p-2 border">Lot #</th>
            {attributeKeys.map((key) => (
              <th key={key} className="p-2 border capitalize">{key}</th>
            ))}
            {role === 'admin' && <th className="p-2 border">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="p-2 border">{item.name}</td>
              <td className="p-2 border">{item.part_number}</td>
              <td className="p-2 border">{item.description}</td>
              <td className="p-2 border">{item.quantity}</td>
              <td className="p-2 border">{item.location}</td>
              <td className="p-2 border">
                {item.has_lot ? item.lot_number || <em className="text-gray-400">N/A</em> : <em className="text-gray-400">Disabled</em>}
              </td>
              {attributeKeys.map((key) => (
                <td key={key} className="p-2 border">
                  {item.attributes?.[key] || <em className="text-gray-400">—</em>}
                </td>
              ))}
              {role === 'admin' && (
                <td className="p-2 border whitespace-nowrap">
                  <button
                    onClick={() => navigate(`/edit/${item.id}`)}
                    className="bg-gray-800 text-white px-3 py-1 rounded mr-2 hover:bg-gray-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6 + attributeKeys.length + (role === 'admin' ? 1 : 0)} className="p-4 text-center text-gray-500">
                No items to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-center mt-4 space-x-4">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="py-1">Page {page} of {totalPages}</span>
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
