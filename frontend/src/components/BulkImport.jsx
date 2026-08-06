import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Button from './ui/Button';
import { FiUploadCloud, FiX } from 'react-icons/fi';
import api from '../utils/axiosConfig';
import {
  buildColumnMapping,
  detectBestSheet,
  detectHeaderRow,
  filterMappedDataRows,
  getImportFieldOptions,
  matrixToObjects,
} from '../config/inventoryProfiles';

function normalizeTemplates(settings) {
  return Array.isArray(settings?.import_templates)
    ? settings.import_templates
    : [];
}

export default function BulkImport({
  clientId,
  settings = {},
  refresh,
  refreshSettings,
  onClose,
}) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [sheetMatrices, setSheetMatrices] = useState({});
  const [sheetName, setSheetName] = useState('');
  const [headerIndex, setHeaderIndex] = useState(0);
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [locations, setLocations] = useState([]);
  const [defaultLocationId, setDefaultLocationId] = useState(
    settings?.default_location_id ? String(settings.default_location_id) : '',
  );
  const [saveDefaultLocation, setSaveDefaultLocation] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fieldOptions = useMemo(
    () => getImportFieldOptions(settings),
    [settings],
  );
  const templates = useMemo(() => normalizeTemplates(settings), [settings]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const { data } = await api.get('/api/locations');
        setLocations(Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            'Failed to load warehouse locations.',
        );
      }
    };
    loadLocations();
  }, []);

  const applySheet = (
    selectedSheet,
    selectedHeaderIndex,
    mappingOverride = null,
    matrices = sheetMatrices,
  ) => {
    const matrix = matrices[selectedSheet] || [];
    const nextHeaderIndex = Math.max(
      0,
      Math.min(Number(selectedHeaderIndex) || 0, Math.max(matrix.length - 1, 0)),
    );
    const nextHeaders = (matrix[nextHeaderIndex] || [])
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
    const nextMapping =
      mappingOverride || buildColumnMapping(nextHeaders, settings);
    const rows = filterMappedDataRows(
      matrixToObjects(matrix, nextHeaderIndex),
      nextMapping,
    );

    setSheetName(selectedSheet);
    setHeaderIndex(nextHeaderIndex);
    setHeaders(nextHeaders);
    setMapping(nextMapping);
    setRawRows(rows);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setTemplateName(`${file.name.replace(/\.[^.]+$/, '')} Mapping`);
    setError('');
    setSuccess('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const matrices = {};

      workbook.SheetNames.forEach((name) => {
        matrices[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          defval: '',
          raw: false,
        });
      });

      setSheetMatrices(matrices);

      const defaultTemplate =
        templates.find(
          (template) => template.is_default && matrices[template.sheet_name],
        ) || templates.find((template) => matrices[template.sheet_name]);

      if (defaultTemplate) {
        applySheet(
          defaultTemplate.sheet_name,
          Number(defaultTemplate.header_row || 1) - 1,
          defaultTemplate.column_mapping || {},
          matrices,
        );
        if (defaultTemplate.default_location_id) {
          setDefaultLocationId(String(defaultTemplate.default_location_id));
        }
        setTemplateName(defaultTemplate.name);
      } else {
        const detected = detectBestSheet(matrices, settings);
        if (!detected) throw new Error('No readable worksheet was found.');
        applySheet(
          detected.sheetName,
          detected.headerIndex,
          null,
          matrices,
        );
      }
    } catch (parseError) {
      setSheetMatrices({});
      setHeaders([]);
      setRawRows([]);
      setError(
        parseError?.message ||
          'Failed to parse the file. Confirm it is a valid Excel or CSV file.',
      );
    }
  };

  const handleSheetChange = (event) => {
    const nextSheet = event.target.value;
    const detected = detectHeaderRow(sheetMatrices[nextSheet] || [], settings);
    applySheet(nextSheet, detected.index);
  };

  const handleHeaderRowChange = (event) => {
    const oneBasedRow = Math.max(1, Number(event.target.value) || 1);
    applySheet(sheetName, oneBasedRow - 1);
  };

  const handleMappingChange = (sourceHeader, target) => {
    const nextMapping = {
      ...mapping,
      [sourceHeader]: target || null,
    };
    setMapping(nextMapping);
    setRawRows(
      filterMappedDataRows(
        matrixToObjects(sheetMatrices[sheetName] || [], headerIndex),
        nextMapping,
      ),
    );
  };

  const mappedTargets = Object.values(mapping).filter(Boolean);
  const hasQuantityMapping = mappedTargets.includes('total_quantity');
  const hasLocationMapping = mappedTargets.includes('location');
  const hasPartIdentity =
    mappedTargets.includes('part_number') ||
    mappedTargets.includes('vendor_item_number');

  const handleImport = async () => {
    const normalizedClientId = Number(clientId);
    if (!Number.isInteger(normalizedClientId) || normalizedClientId < 1) {
      setError('A valid client is required before importing inventory.');
      return;
    }
    if (rawRows.length === 0) {
      setError('The selected sheet does not contain mapped inventory rows.');
      return;
    }
    if (!hasPartIdentity) {
      setError('Map a Part Number or Vendor Item Number column before importing.');
      return;
    }
    if (hasQuantityMapping && !hasLocationMapping && !defaultLocationId) {
      setError(
        'This workbook has quantities but no mapped Location column. Select a default physical location.',
      );
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const templatePayload = saveTemplate
        ? {
            save: true,
            name: templateName.trim() || `${sheetName} Mapping`,
            sheet_name: sheetName,
            header_row: headerIndex + 1,
            column_mapping: mapping,
            default_location_id: defaultLocationId
              ? Number(defaultLocationId)
              : null,
            is_default: true,
          }
        : null;

      const { data } = await api.post('/api/items/import', {
        client_id: normalizedClientId,
        items: rawRows,
        sheet_name: sheetName,
        header_row: headerIndex + 1,
        column_mapping: mapping,
        default_location_id: defaultLocationId
          ? Number(defaultLocationId)
          : null,
        save_default_location: saveDefaultLocation,
        template: templatePayload,
      });

      const importedCount = data?.successCount ?? rawRows.length;
      const needsReviewCount = Number(data?.needsReviewCount || 0);
      const warningCount = Number(data?.warningCount || 0);
      setSuccess(
        `${importedCount} items imported from ${sheetName}. ${needsReviewCount} need review; ${warningCount} warning(s).`,
      );
      await Promise.all([refresh?.(), refreshSettings?.()]);
    } catch (requestError) {
      const responseData = requestError?.response?.data;
      const validationMessage = Array.isArray(responseData?.errors)
        ? responseData.errors.map((entry) => entry.msg).join(' ')
        : '';
      setError(
        responseData?.message ||
          responseData?.error ||
          validationMessage ||
          `Failed to import data${
            requestError?.response?.status
              ? ` (HTTP ${requestError.response.status})`
              : ''
          }.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto my-4 max-w-6xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Bulk Inventory Import
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Profile: {settings.profile_label || settings.profile_key || 'General'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close import"
          >
            <FiX />
          </button>
        </div>

        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-5 text-center transition-colors hover:border-blue-500 dark:border-slate-700"
          onClick={() => fileRef.current?.click()}
        >
          <FiUploadCloud className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Select an Excel or CSV file
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            The app detects the inventory sheet and header row, then asks you to confirm mappings.
          </p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
          />
          {fileName && (
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {fileName}
            </p>
          )}
        </div>

        {Object.keys(sheetMatrices).length > 0 && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Worksheet
                <select
                  value={sheetName}
                  onChange={handleSheetChange}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  {Object.keys(sheetMatrices).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Header Row
                <input
                  type="number"
                  min="1"
                  value={headerIndex + 1}
                  onChange={handleHeaderRowChange}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Default Location
                <select
                  value={defaultLocationId}
                  onChange={(event) => setDefaultLocationId(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Select when file has no location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.code}
                      {location.description ? ` — ${location.description}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-slate-800 dark:text-white">
                Confirm Column Mapping
              </h3>
              <div className="max-h-80 overflow-auto rounded border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left">Spreadsheet Column</th>
                      <th className="px-3 py-2 text-left">Import As</th>
                      <th className="px-3 py-2 text-left">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header) => (
                      <tr
                        key={header}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-3 py-2 font-medium">{header}</td>
                        <td className="px-3 py-2">
                          <select
                            value={mapping[header] || ''}
                            onChange={(event) =>
                              handleMappingChange(header, event.target.value)
                            }
                            className="w-full min-w-56 rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <option value="">Ignore</option>
                            {fieldOptions.map((field) => (
                              <option key={field.key} value={field.key}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-slate-500">
                          {String(rawRows[0]?.[header] ?? '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-slate-800 dark:text-white">
                Data Preview — {rawRows.length} row(s)
              </h3>
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      {headers
                        .filter((header) => mapping[header])
                        .map((header) => (
                          <th key={header} className="whitespace-nowrap px-3 py-2 text-left">
                            {header}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
                        {headers
                          .filter((header) => mapping[header])
                          .map((header) => (
                            <td key={header} className="whitespace-nowrap px-3 py-2">
                              {String(row[header] ?? '')}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 rounded bg-slate-50 p-3 text-sm dark:bg-slate-800/60 md:grid-cols-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={saveTemplate}
                  onChange={(event) => setSaveTemplate(event.target.checked)}
                />
                Save this mapping for future files
              </label>
              {saveTemplate && (
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Template name"
                  className="rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={saveDefaultLocation}
                  onChange={(event) => setSaveDefaultLocation(event.target.checked)}
                  disabled={!defaultLocationId}
                />
                Use selected location as this client’s default
              </label>
            </div>

            {error && (
              <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-900/20 dark:text-green-300">
                {success}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={submitting}>
                Close
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  submitting ||
                  rawRows.length === 0 ||
                  !hasPartIdentity ||
                  (hasQuantityMapping && !hasLocationMapping && !defaultLocationId)
                }
                variant="primary"
              >
                {submitting ? 'Importing…' : `Import ${rawRows.length} Items`}
              </Button>
            </div>
          </div>
        )}

        {error && Object.keys(sheetMatrices).length === 0 && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
