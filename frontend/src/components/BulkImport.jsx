// src/components/BulkImport.jsx
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import axios from '../utils/axiosConfig';

/** normalize any string → snake_case */
function normalizeKey(str) {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

/** prettify for labels */
function humanLabel(key) {
  return normalizeKey(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** if you have well-known numeric fields, list them here */
const NUMERIC_KEYS = new Set([
  'qty_in_stock',
  'quantity',
  'low_stock_threshold',
  'on_hand',
  // …add more as needed
]);

export default function BulkImport({ clientId, refresh, onClose }) {
  const fileRef = useRef(null);
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [inputValues, setInputValues] = useState({});
  const [mapping, setMapping] = useState({}); // col → normalizedKey
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** load CSV/XLSX and extract rows + headers */
  const handleFileChange = (e) => {
    setError('');
    setSuccess('');
    setHeaders([]);
    setRawRows([]);
    setPreviewRows([]);
    setInputValues({});
    setMapping({});

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      let rows = [];
      // CSV
      if (/\.csv$/i.test(file.name)) {
        const text = evt.target.result;
        const lines = text
          .split('\n')
          .map((l) => l.replace(/\r/, ''))
          .filter(Boolean);
        const cols = lines[0].split(',').map((h) => h.trim());
        rows = lines.slice(1).map((line) => {
          const vals = line.split(',');
          return cols.reduce((acc, col, i) => {
            acc[col] = vals[i]?.trim() ?? '';
            return acc;
          }, {});
        });
        setHeaders(cols);
      }
      // XLSX
      else {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setHeaders(rows.length ? Object.keys(rows[0]) : []);
      }

      setRawRows(rows);
      setPreviewRows(rows.slice(0, 5));
    };

    if (/\.csv$/i.test(file.name)) reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  /** track mapping input as user types */
  const handleInputChange = (col, val) => {
    setInputValues((prev) => ({ ...prev, [col]: val }));
  };

  /** on blur, normalize and store mapping */
  const handleMappingBlur = (col) => {
    const raw = inputValues[col]?.trim() ?? '';
    if (!raw) {
      const m = { ...mapping };
      delete m[col];
      setMapping(m);
    } else {
      setMapping((prev) => ({
        ...prev,
        [col]: normalizeKey(raw),
      }));
    }
  };

  /** generate and post items */
  const handleImport = async () => {
    setError('');
    setSuccess('');

    const mappedCols = Object.values(mapping);
    if (mappedCols.length === 0) {
      setError('Please map at least one column.');
      return;
    }

    // build items[]
    const items = rawRows.map((row) => {
      const attributes = {};
      for (const [col, key] of Object.entries(mapping)) {
        const rawVal = row[col];
        if (rawVal == null || rawVal === '') continue;

        if (NUMERIC_KEYS.has(key)) {
          const n = Number(rawVal);
          if (!isNaN(n)) attributes[key] = n;
        } else {
          attributes[key] = rawVal;
        }
      }
      return { attributes };
    });

    setSubmitting(true);
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
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
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
        accept=".csv, .xlsx, .xls"
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
                  <label className="w-32 text-gray-700">
                    Import “{col}” as
                  </label>
                  <input
                    type="text"
                    placeholder="internal_key"
                    value={inputValues[col] || ''}
                    onChange={(e) => handleInputChange(col, e.target.value)}
                    onBlur={() => handleMappingBlur(col)}
                    disabled={submitting}
                    className="flex-1 border rounded px-2 py-1"
                  />
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
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded disabled:opacity-50"
            >
              {submitting ? 'Importing…' : 'Import'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
