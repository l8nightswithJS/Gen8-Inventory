// frontend/src/components/BulkImport.jsx
import { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Button from './ui/Button';
import { FiUploadCloud } from 'react-icons/fi';
import api from '../utils/axiosConfig'; // ✅ unified axios instance

export default function BulkImport({ clientId, refresh, onClose }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [inputValues, setInputValues] = useState({});
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalizeKey = (str) =>
    str
      ?.toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '')
      .replace(/_+/g, '_') || '';

  const humanLabel = (key) =>
    normalizeKey(key)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const AUTO_MAP_SUGGESTIONS = {
    part_number: ['part', 'part_number', 'part #', 'sku'],
    description: ['desc', 'description'],
    quantity: ['qty', 'quantity', 'on_hand', 'stock', 'qty_in_stock'],
    reorder_level: [
      'reorder_level',
      'reorder level',
      'threshold',
      'restock_at',
    ],
    reorder_qty: ['reorder_qty', 'reorder quantity', 'restock_qty'],
    location: ['location', 'loc', 'bin'],
    lot_number: ['lot', 'lot_number', 'lot #'],
  };

  const NUMERIC_KEYS = new Set([
    'quantity',
    'on_hand',
    'qty_in_stock',
    'stock',
    'reorder_level',
    'reorder_qty',
    'low_stock_threshold',
  ]);

  // Auto-map common headers when file is loaded
  useEffect(() => {
    if (!headers.length) return;
    const newInputs = {};
    const newMapping = {};
    headers.forEach((header) => {
      const normalizedHeader = normalizeKey(header).replace(/_/g, ' ');
      for (const [internalKey, aliases] of Object.entries(
        AUTO_MAP_SUGGESTIONS,
      )) {
        if (aliases.includes(normalizedHeader)) {
          newInputs[header] = internalKey;
          newMapping[header] = internalKey;
          break;
        }
      }
    });
    setInputValues(newInputs);
    setMapping(newMapping);
  }, [headers]);

  const resetState = () => {
    setHeaders([]);
    setRawRows([]);
    setPreviewRows([]);
    setInputValues({});
    setMapping({});
    setFileName('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    resetState();
    setError('');
    setSuccess('');
    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        let rows = [];
        let sheetHeaders = [];
        if (/\.csv$/i.test(file.name)) {
          const text = evt.target.result;
          const lines = text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          sheetHeaders = lines[0].split(',').map((h) => h.trim());
          rows = lines.slice(1).map((line) => {
            const vals = line.split(',');
            return sheetHeaders.reduce((acc, col, i) => {
              acc[col] = vals[i]?.trim() ?? '';
              return acc;
            }, {});
          });
        } else {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          sheetHeaders = rows.length ? Object.keys(rows[0]) : [];
        }
        setHeaders(sheetHeaders);
        setRawRows(rows);
        setPreviewRows(rows.slice(0, 5));
      } catch (parseError) {
        console.error('File parsing error:', parseError);
        setError(
          "Could not parse the uploaded file. Please ensure it's a valid .csv or .xlsx file.",
        );
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      setError('An error occurred while trying to read the file.');
    };

    reader.readAsBinaryString(file);
  };

  const handleInputChange = (col, val) =>
    setInputValues((prev) => ({ ...prev, [col]: val }));

  const handleMappingBlur = (col) => {
    const raw = inputValues[col]?.trim() ?? '';
    setMapping((prev) => ({ ...prev, [col]: normalizeKey(raw) }));
  };

  const handleImport = async () => {
    setError('');
    setSuccess('');
    const validMappings = Object.entries(mapping).filter(([, to]) => to);
    if (validMappings.length === 0) {
      setError('Please map at least one column to an internal key.');
      return;
    }
    const items = rawRows
      .map((row) => {
        const attributes = {};
        for (const [col, key] of validMappings) {
          const rawVal = row[col];
          if (rawVal == null || rawVal === '') continue;
          if (NUMERIC_KEYS.has(key)) {
            const n = Number(rawVal);
            if (!isNaN(n)) attributes[key] = n;
          } else {
            attributes[key] = String(rawVal).trim();
          }
        }
        return { attributes };
      })
      .filter((item) => Object.keys(item.attributes).length > 0);

    setSubmitting(true);
    try {
      const resp = await api.post('/api/items/bulk', {
        client_id: parseInt(clientId, 10),
        items,
      });
      setSuccess(`${resp.data.successCount} items imported successfully.`);
      await refresh?.();
      resetState();
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => onClose?.(), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl relative space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">
            Import Items in Bulk
          </h3>
          <p className="text-sm text-gray-500">
            Upload a .csv or .xlsx file to get started.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={submitting}
          >
            &times;
          </button>
        )}
      </div>

      <div>
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <FiUploadCloud className="w-8 h-8 mb-2 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500">{fileName || 'CSV or XLSX'}</p>
          </div>
          <input
            ref={fileRef}
            id="file-upload"
            type="file"
            className="hidden"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {headers.length > 0 && (
        <>
          <div className="bg-gray-50 border rounded p-4">
            <h4 className="font-medium mb-3">Map Your Columns</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {headers.map((col) => (
                <div key={col} className="space-y-1">
                  <label
                    htmlFor={`map-${col}`}
                    className="text-sm font-medium text-gray-700"
                  >
                    File Header:{' '}
                    <span className="font-bold">{humanLabel(col)}</span>
                  </label>
                  <input
                    id={`map-${col}`}
                    type="text"
                    placeholder="Map to internal key (e.g., part_number)"
                    value={inputValues[col] || ''}
                    onChange={(e) => handleInputChange(col, e.target.value)}
                    onBlur={() => handleMappingBlur(col)}
                    disabled={submitting}
                    className="w-full border rounded px-3 py-2 border-gray-300"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr className="text-left">
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {humanLabel(h)}
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
                      <td key={h} className="px-3 py-2 truncate max-w-xs">
                        {String(row[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end items-center gap-4 pt-2">
            {error && (
              <p className="text-red-600 text-sm font-medium">{error}</p>
            )}
            {success && (
              <p className="text-green-600 text-sm font-medium">{success}</p>
            )}
            <Button
              onClick={handleImport}
              disabled={submitting}
              variant="primary"
              size="md"
            >
              {submitting ? 'Importing…' : `Import ${rawRows.length} Items`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
