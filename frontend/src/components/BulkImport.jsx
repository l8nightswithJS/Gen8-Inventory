import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Item Name (required)' },
  { key: 'part_number', label: 'Part Number (required)' },
  { key: 'quantity', label: 'Quantity (required)' }
];
const OPTIONAL_FIELDS = [
  { key: 'description', label: 'Description' },
  { key: 'lot_number', label: 'Lot Number' },
  { key: 'location', label: 'Location' }
];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

export default function BulkImport({ refresh, clientId }) {
  const fileRef = useRef();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [rawRows, setRawRows] = useState([]);

  const handleFileChange = (e) => {
    setError('');
    setSuccess('');
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setRawRows([]);

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      let rows = [];
      if (file.name.endsWith('.csv')) {
        const text = evt.target.result;
        const lines = text.split('\n').map(line => line.replace('\r', ''));
        const cols = lines[0].split(',').map(h => h.trim());
        rows = lines.slice(1).filter(Boolean).map(line => {
          const vals = line.split(',');
          return cols.reduce((acc, h, i) => {
            acc[h] = vals[i]?.trim() || '';
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

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleMappingChange = (appField, excelCol) => {
    setMapping(prev => ({ ...prev, [appField]: excelCol }));
  };

  const handleImport = async () => {
    setError('');
    setSuccess('');

    // Ensure required fields are mapped
    for (const field of REQUIRED_FIELDS) {
      if (!mapping[field.key]) {
        setError(`Map required field: ${field.label}`);
        return;
      }
    }

    // Build payloads
    const payloads = rawRows.map(row => {
      const item = {};
      ALL_FIELDS.forEach(f => {
        item[f.key] = mapping[f.key] ? row[mapping[f.key]] : '';
      });
      return { client_id: clientId, ...item };
    });

    try {
      const { data, error: insertError } = await supabase
        .from('items')
        .insert(payloads);

      if (insertError) throw insertError;

      setSuccess(`${data.length} imported.`);
      // Reset UI
      setRawRows([]);
      setPreviewRows([]);
      setMapping({});
      setHeaders([]);
      if (fileRef.current) fileRef.current.value = '';
      if (refresh) refresh();
    } catch (err) {
      setError(err.message || 'Bulk import failed');
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <label>
        <b>Bulk Import (Excel or CSV)</b>
        <input
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          ref={fileRef}
          onChange={handleFileChange}
          style={{ marginLeft: '1rem' }}
        />
      </label>

      {headers.length > 0 && (
        <div style={{ margin: '1rem 0', background: '#f7f7fa', padding: 16, borderRadius: 8 }}>
          <div><b>Column Mapping:</b></div>
          {ALL_FIELDS.map(field => (
            <div key={field.key} style={{ marginBottom: 8 }}>
              <span>{field.label}: </span>
              <select
                value={mapping[field.key] || ''}
                onChange={e => handleMappingChange(field.key, e.target.value)}
                style={{ minWidth: 120 }}
              >
                <option value="">-- Not Mapped --</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {previewRows.length > 0 && (
        <div style={{ marginBottom: 10, fontSize: '0.95rem', color: '#333' }}>
          <b>Preview:</b>
          <table style={{ borderCollapse: 'collapse', marginTop: 5 }}>
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h} style={{ border: '1px solid #ccc', padding: 3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i}>
                  {headers.map(h => (
                    <td key={h} style={{ border: '1px solid #eee', padding: 3 }}>{row[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {headers.length > 0 && (
        <button onClick={handleImport} style={{ margin: '0.5rem 0 1rem 0' }}>
          Import
        </button>
      )}

      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}

      <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
        You can upload Excel (.xlsx) or CSV files.<br />
        Map each column to the correct field before importing.
      </div>
    </div>
  );
}
