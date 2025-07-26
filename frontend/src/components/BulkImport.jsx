import React, { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import axios from '../utils/axiosConfig'

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Item Name (required)' },
  { key: 'part_number', label: 'Part Number (required)' },
  { key: 'quantity', label: 'Quantity (required)' },
]
const OPTIONAL_FIELDS = [
  { key: 'description', label: 'Description' },
  { key: 'lot_number', label: 'Lot Number' },
  { key: 'location', label: 'Location' },
]
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

export default function BulkImport({ clientId, refresh, onClose }) {
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [headers, setHeaders] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [rawRows, setRawRows] = useState([])

  const handleFileChange = e => {
    setError('')
    setSuccess('')
    setHeaders([])
    setPreviewRows([])
    setMapping({})
    setRawRows([])

    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = evt => {
      let rows = []
      if (file.name.match(/\.csv$/i)) {
        const text = evt.target.result
        const lines = text
          .split('\n')
          .map(l => l.replace(/\r/, ''))
          .filter(Boolean)
        const cols = lines[0].split(',').map(h => h.trim())
        rows = lines.slice(1).map(line => {
          const vals = line.split(',')
          return cols.reduce((acc, col, i) => {
            acc[col] = vals[i]?.trim() || ''
            return acc
          }, {})
        })
        setHeaders(cols)
      } else {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        setHeaders(rows.length ? Object.keys(rows[0]) : [])
      }
      setRawRows(rows)
      setPreviewRows(rows.slice(0, 5))
    }

    file.name.match(/\.csv$/i)
      ? reader.readAsText(file)
      : reader.readAsBinaryString(file)
  }

  const handleMappingChange = (appField, excelCol) => {
    setMapping(prev => ({ ...prev, [appField]: excelCol }))
  }

  const handleImport = async () => {
    setError('')
    setSuccess('')

    // ensure all required
    for (let f of REQUIRED_FIELDS) {
      if (!mapping[f.key]) {
        setError(`Please map: ${f.label}`)
        return
      }
    }

    const items = rawRows.map(row => {
      const it = {}
      ALL_FIELDS.forEach(f => {
        let v = mapping[f.key] ? row[mapping[f.key]] : ''
        if (f.key === 'quantity') {
          const n = parseInt(v, 10)
          it.quantity = isNaN(n) ? 0 : n
        } else {
          it[f.key] = v || null
        }
      })
      it.client_id = parseInt(clientId, 10)
      return it
    })

    try {
      const resp = await axios.post('/api/items/bulk', { items })
      setSuccess(
        `${resp.data.successCount} imported, ${resp.data.failCount} failed.`
      )
      fileRef.current.value = ''
      setRawRows([])
      setPreviewRows([])
      setMapping({})
      setHeaders([])
      refresh && refresh()
      onClose && onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk import failed')
    }
  }

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
              {ALL_FIELDS.map(f => (
                <div key={f.key} className="flex items-center space-x-2">
                  <label className="w-40 text-gray-700">{f.label}</label>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={e =>
                      handleMappingChange(f.key, e.target.value)
                    }
                    className="flex-1 border rounded px-2 py-1"
                  >
                    <option value="">-- Not Mapped --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {headers.map(h => (
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
                    {headers.map(h => (
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
  )
}
