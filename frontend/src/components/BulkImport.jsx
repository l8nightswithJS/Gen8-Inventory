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
          'Failed to parse the file. Please ensure it is a valid Excel or CSV file.',
        );
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/api/clients/${clientId}/import`, { items: rawRows });
      setSuccess(`${rawRows.length} items imported successfully!`);
      refresh?.();
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to import data.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-4xl mx-auto my-8 border border-slate-200 dark:border-slate-800">
      <div
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        onClick={() => fileRef.current.click()}
      >
        <FiUploadCloud className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            Click to upload
          </span>{' '}
          or drag and drop.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
          Excel (XLSX) or CSV files
        </p>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".xlsx, .xls, .csv"
        />
        {fileName && (
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-3">
            {fileName}
          </p>
        )}
      </div>

      {rawRows.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-white mb-2">
            Preview (First 5 Rows)
          </h3>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr className="text-left">
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900">
                {rawRows.slice(0, 5).map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    {headers.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-2 truncate max-w-xs text-slate-700 dark:text-slate-300"
                      >
                        {String(row[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end items-center gap-4 pt-4">
            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                {success}
              </p>
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
        </div>
      )}
    </div>
  );
}
