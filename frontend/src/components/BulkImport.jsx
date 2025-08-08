import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import axios from '../utils/axiosConfig';

export default function BulkImport({ clientId, refresh, onClose }) {
  const fileRef = useRef(null);
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [inputValues, setInputValues] = useState({});
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setError('');
    setSuccess('');
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setInputValues({});
    setRawRows([]);

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      let rows = [];

      if (file.name.match(/\.csv$/i)) {
        const text = evt.target.result;
        const lines = text
          .split('\n')
          .map((l) => l.replace(/\r/, ''))
          .filter(Boolean);
        const cols = lines[0].split(',').map((h) => h.trim());
        rows = lines.slice(1).map((line) => {
          const vals = line.split(',');
          return cols.reduce((acc, col, i) => {
            acc[col] = vals[i]?.trim() || '';
            return acc;
          }, {});
        });
        setHeaders(cols);
      } else {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setHeaders(rows.length ? Object.keys(rows[0]) : []);
      }

      setRawRows(rows);
      setPreviewRows(rows.slice(0, 5));
    };

    file.name.match(/\.csv$/i)
      ? reader.readAsText(file)
      : reader.readAsBinaryString(file);
  };

  const handleInputChange = (col, val) => {
    setInputValues((prev) => ({ ...prev, [col]: val }));
  };

  const handleMappingBlur = (col) => {
    const val = inputValues[col]?.trim();
    if (!val) {
      const updated = { ...mapping };
      delete updated[col];
      setMapping(updated);
    } else {
      setMapping((prev) => ({ ...prev, [col]: val }));
    }
  };

  const handleImport = async () => {
    setError('');
    setSuccess('');

    if (Object.keys(mapping).length === 0) {
      setError('Please map at least one column.');
      return;
    }

    const items = rawRows.map((row) => {
      const attributes = {};
      Object.entries(mapping).forEach(([col, internalKey]) => {
        const val = row[col];
        attributes[internalKey] = val === '' ? null : val;
      });
      return {
        client_id: parseInt(clientId, 10),
        attributes,
      };
    });

    try {
      const resp = await axios.post('/api/items/bulk', {
        client_id: parseInt(clientId, 10),
        items,
      });

      setSuccess(
        `${resp.data.successCount} imported, ${resp.data.failCount} failed.`,
      );

      fileRef.current.value = '';
      setRawRows([]);
      setPreviewRows([]);
      setMapping({});
      setInputValues({});
      setHeaders([]);

      if (refresh) await refresh();
      console.log('Refreshed items after import');
      if (onClose) onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk import failed');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold">Import Items in Bulk</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
          >
            &times;
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleFileChange}
        className="file:py-2 file:px-4 file:border-0 file:bg-indigo-600 file:text-white file:rounded hover:file:bg-indigo-700"
      />

      {headers.length > 0 && (
        <>
          <div className="bg-gray-50 border rounded p-4">
            <h4 className="font-medium mb-3">Map Your Columns</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {headers.map((col) => (
                <div key={col} className="flex items-center space-x-2">
                  <label className="w-32 text-gray-700">Import as</label>
                  <input
                    type="text"
                    placeholder="Internal field name"
                    value={inputValues[col] || ''}
                    onChange={(e) => handleInputChange(col, e.target.value)}
                    onBlur={() => handleMappingBlur(col)}
                    className="flex-1 border rounded px-2 py-1"
                  />
                  <span className="text-gray-500 text-sm">{col}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-2">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end items-center space-x-4">
            {error && <p className="text-red-600">{error}</p>}
            {success && <p className="text-green-600">{success}</p>}
            <button
              onClick={handleImport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded"
            >
              Import
            </button>
          </div>
        </>
      )}
    </div>
  );
}
