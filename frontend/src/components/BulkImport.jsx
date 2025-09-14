// frontend/src/components/BulkImport.jsx (Final Corrected Version)
import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Button from './ui/Button';
import { FiUploadCloud } from 'react-icons/fi';
import api from '../utils/axiosConfig';

export default function BulkImport({ clientId, refresh, onClose }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setHeaders(rows.length ? Object.keys(rows[0]) : []);
        setRawRows(rows);
      } catch (parseError) {
        setError(
          "Could not parse the file. Please ensure it's a valid .xlsx or .csv file.",
        );
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (rawRows.length === 0) {
      setError('No data found in the file to import.');
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const resp = await api.post('/api/items/bulk', {
        client_id: parseInt(clientId, 10),
        items: rawRows,
      });
      setSuccess(`${resp.data.successCount} items imported successfully.`);
      await refresh?.();
      setTimeout(() => onClose?.(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl space-y-4">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-semibold text-gray-800">
          Import Items in Bulk
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl"
          disabled={submitting}
        >
          &times;
        </button>
      </div>
      <p className="text-sm text-gray-500 -mt-2">
        The backend will automatically map common columns like &apos;Part
        Number&apos;, &apos;Lot #&apos;, &apos;Description&apos;, etc.
      </p>

      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
      >
        <FiUploadCloud className="w-8 h-8 mb-2 text-gray-500" />
        <p className="mb-2 text-sm text-gray-500">
          <span className="font-semibold">Click to upload</span> or drag and
          drop
        </p>
        <p className="text-xs text-gray-500">{fileName || 'CSV or XLSX'}</p>
        <input
          ref={fileRef}
          id="file-upload"
          type="file"
          className="hidden"
          accept=".csv, .xlsx, .xls"
          onChange={handleFileChange}
        />
      </label>

      {rawRows.length > 0 && (
        <>
          <h4 className="font-medium">File Preview</h4>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr className="text-left">
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 5).map((row, i) => (
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
              disabled={submitting || rawRows.length === 0}
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
