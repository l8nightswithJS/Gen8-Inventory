import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function InventoryTable({ items, refresh, role, page, totalPages, onPageChange, clientId }) {
  const navigate = useNavigate();

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
    <div style={{ overflowX: 'auto', margin: '2rem auto', maxWidth: '90%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Segoe UI, sans-serif', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <thead style={{ backgroundColor: '#2e2e2e', color: 'white' }}>
          <tr>
            <th style={{ padding: '12px' }}>Name</th>
            <th style={{ padding: '12px' }}>Part #</th>
            <th style={{ padding: '12px' }}>Description</th>
            <th style={{ padding: '12px' }}>Lot #</th>
            <th style={{ padding: '12px' }}>Quantity</th>
            <th style={{ padding: '12px' }}>Location</th>
            {role === 'admin' && <th style={{ padding: '12px' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff', transition: 'background-color 0.3s' }}>
              <td style={{ padding: '10px' }}>{item.name}</td>
              <td style={{ padding: '10px' }}>{item.part_number}</td>
              <td style={{ padding: '10px' }}>{item.description}</td>
              <td style={{ padding: '10px' }}>{item.lot_number}</td>
              <td style={{ padding: '10px' }}>{item.quantity}</td>
              <td style={{ padding: '10px' }}>{item.location}</td>
              {role === 'admin' && (
                <td style={{ padding: '10px' }}>
                  <button onClick={() => navigate(`/edit/${item.id}?client_id=${clientId}`)} style={{ backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', padding: '6px 12px', marginRight: '0.5rem', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', borderRadius: '5px', padding: '6px 12px', cursor: 'pointer' }}>Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', gap: '1rem' }}>
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
