import React, { useState } from 'react';
import Papa from 'papaparse';
import axios from '../utils/axiosConfig';

export default function BulkImport({ clientId, refresh }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
    setError('');
  };

  const handleImport = () => {
    if (!file) return setError('Please select a CSV file');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedItems = results.data.map((row) => {
            // Known base fields
            const {
              name,
              part_number,
              description,
              quantity,
              location,
              lot_number,
              has_lot,
              ...extraAttributes
            } = row;

            return {
              client_id: clientId,
              name: name?.trim(),
              part_number: part_number?.trim(),
              description: description?.trim(),
              quantity: parseInt(quantity, 10) || 0,
              location: location?.trim(),
              lot_number: lot_number?.trim(),
              has_lot: has_lot?.toLowerCase?.() === 'true' || has_lot === '1' ? 1 : 0,
              attributes: extraAttributes,
            };
          });

          const res = await axios.post('/api/items/import', {
            client_id: clientId,
            items: parsedItems,
          });

          setMessage(`Imported: ${res.data.successCount} | Failed: ${res.data.failCount}`);
          setError('');
          if (refresh) refresh();
        } catch (err) {
          console.error(err);
          setError('Import failed. Check console and CSV format.');
          setMessage('');
        }
      },
    });
  };

  return (
    <div className="my-6">
      <h3 className="text-lg font-semibold mb-2">Bulk Import</h3>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="mb-2 block"
      />
      <button
        onClick={handleImport}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Import CSV
      </button>

      {message && <p className="text-green-600 mt-2">{message}</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
