import React, { useState } from 'react';
import Papa from 'papaparse';
import axios from '../utils/axiosConfig';

export default function BulkImport({ clientId, refresh }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('');
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a CSV file.');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawItems = results.data;
        const cleanedItems = rawItems.map((item) => {
          return {
            name: item.name?.trim() || '',
            part_number: item.part_number?.trim() || '',
            description: item.description?.trim() || '',
            lot_number: item.lot_number?.trim() || '',
            quantity: parseInt(item.quantity, 10) || 0,
            location: item.location?.trim() || '',
            has_lot: item.has_lot?.toLowerCase() === 'false' ? 0 : 1,
            client_id: clientId,
          };
        });

        try {
          const res = await axios.post('/api/items/bulk', {
            client_id: clientId,
            items: cleanedItems,
          });
          setStatus(`Imported: ${res.data.successCount}, Failed: ${res.data.failCount}`);
          if (refresh) refresh();
        } catch (err) {
          console.error('Bulk import error:', err);
          setStatus('Failed to upload items.');
        }
      },
    });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mt-6">
      <h3 className="text-lg font-semibold mb-2">Bulk Import Items</h3>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="mb-2"
      />
      <button
        onClick={handleUpload}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-4 rounded"
      >
        Upload
      </button>
      {status && <p className="mt-2 text-sm text-gray-700">{status}</p>}
    </div>
  );
}
