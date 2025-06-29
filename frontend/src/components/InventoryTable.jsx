import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function InventoryTable({ items, page, totalPages, onPage, refresh }) {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  const clientId = new URLSearchParams(window.location.search).get('client_id');

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      await fetch(`http://localhost:8000/api/items/${id}?client_id=${clientId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      refresh();
    }
  };

  return (
    <div className="overflow-x-auto mt-6">
      <table className="w-full border text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Description</th>
            {role === 'admin' && <th className="p-2 border text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items
            .filter(item => item.name?.trim() && item.description?.trim()) // 👈 filter out blanks
            .map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="p-2 border">{item.name}</td>
              <td className="p-2 border">{item.description}</td>
              {role === 'admin' && (
                <td className="p-2 border text-center space-x-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => navigate(`/edit/${item.id}?client_id=${clientId}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={role === 'admin' ? 3 : 2} className="p-4 text-center text-gray-500">
                No items found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="self-center">Page {page} of {totalPages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
