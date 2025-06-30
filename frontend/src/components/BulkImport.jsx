import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function BulkImport({ clientId, refresh }) {
  const [json, setJson] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleImport = async () => {
    try {
      const payload = {
        client_id: clientId,
        items: JSON.parse(json)
      };
      const { data } = await axios.post(
        '/api/items/import',
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setResult(data);
      setError('');
      refresh();
    } catch (err) {
      setError('Failed to import items. Check format.');
      setResult(null);
    }
  };

  return (
    <div className="bg-white p-4 border rounded shadow mt-6">
      <h3 className="text-lg font-semibold mb-2">Bulk Import</h3>
      <textarea
        rows="6"
        className="w-full border p-2 mb-2"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='[{"name":"Item A", "quantity":10}, ...]'
      />
      <button onClick={handleImport} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Import
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {result && (
        <p className="text-green-600 mt-2">
          Imported {result.successCount} items. {result.failCount} failed.
        </p>
      )}
    </div>
  );
}
