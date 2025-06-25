import React, { useRef, useState } from 'react';
import axios from '../utils/axiosConfig';

export default function BulkImport({ refresh, clientId }) {
  const fileRef = useRef();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = async (e) => {
    setError('');
    setSuccess('');
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const lines = evt.target.result.split('\n').filter(Boolean);
        const items = lines.slice(1).map(line => {
          const cols = line.split(',');
          return {
            name: cols[0]?.trim(),
            part_number: cols[1]?.trim(),
            description: cols[2]?.trim(),
            lot_number: cols[3]?.trim(),
            quantity: cols[4]?.trim(),
            location: cols[5]?.trim()
          };
        });
        const res = await axios.post('http://localhost:8000/api/items/bulk', { items, client_id: clientId });
        setSuccess(`${res.data.successCount} imported, ${res.data.failCount} failed.`);
        refresh();
      } catch (err) {
        setError(err.response?.data?.message || 'Bulk import failed');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <label>
        <b>Bulk Import CSV</b>{' '}
        <input
          type="file"
          accept=".csv"
          ref={fileRef}
          onChange={handleFileChange}
          style={{ marginLeft: '1rem' }}
        />
      </label>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
      <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
        Format: name,part_number,description,lot_number,quantity,location
      </div>
    </div>
  );
}
