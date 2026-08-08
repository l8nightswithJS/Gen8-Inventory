import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Button from './ui/Button';
import { FiInfo, FiUploadCloud, FiX } from 'react-icons/fi';
import api from '../utils/axiosConfig';
import {
  buildColumnMapping,
  detectBestSheet,
  detectHeaderRow,
  filterMappedDataRows,
  getCalculatedImportField,
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
  const [locationStrategy, setLocationStrategy] = useState('staging');
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
  const stagingLocation = useMemo(
    () => locations.find((location) => String(location.code).toUpperCase() === 'STAGING'),
    [locations],
  );

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const { data } = await api.get('/api/locations');
        setLocations(
          (Array.isArray(data) ? data : []).filter((location) => location.active !== false),
        );
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message || 'Failed to load warehouse locations.',
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
    const nextMapping = mappingOverride || buildColumnMapping(nextHeaders, settings);
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

      const template =
        templates.find(
          (entry) => entry.is_default && matrices[entry.sheet_name],
        ) || templates.find((entry) => matrices[entry.sheet_name]);

      if (template) {
        applySheet(
          template.sheet_name,
          Number(template.header_row || 1) - 1,
          template.column_mapping || {},
          matrices,
        );
        setLocationStrategy(template.location_strategy || 'staging');
        if (template.default_location_id) {
          setDefaultLocationId(String(template.default_location_id));
        }
        setTemplateName(template.name);
      } else {
        const detected = detectBestSheet(matrices, settings);
        if (!detected) throw new Error('No readable worksheet was found.');
        applySheet(detected.sheetName, detected.headerIndex, null, matrices);
        setLocationStrategy('staging');
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
    const nextMapping = { ...mapping, [sourceHeader]: target || null };
    setMapping(nextMapping);
    setRawRows(
      filterMappedDataRows(
        matrixToObjects(sheetMatrices[sheetName] || [], headerIndex),
        nextMapping,
      ),
    );
  };

  const mappedTargets = Object.values(mapping).filter(Boolean);
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
    if (locationStrategy === 'selected' && !defaultLocationId) {
      setError('Select the destination warehouse location.');
      return;
    }
    if (locationStrategy === 'staging' && !stagingLocation) {
      setError('STAGING is not configured yet. Run the warehouse database migration first.');
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
            default_location_id:
              locationStrategy === 'selected' && defaultLocationId
                ? Number(defaultLocationId)
                : null,
            location_strategy: locationStrategy,
            is_default: true,
          }
        : null;

      const { data } = await api.post('/api/items/import', {
        client_id: normalizedClientId,
        items: rawRows,
        sheet_name: sheetName,
        header_row: headerIndex + 1,
        column_mapping: mapping,
        location_strategy: locationStrategy,
        default_location_id:
          locationStrategy === 'selected' && defaultLocationId
            ? Number(defaultLocationId)
            : null,
        save_default_location:
          locationStrategy === 'selected' && saveDefaultLocation,
        template: templatePayload,
      });

      const importedCount = data?.successCount ?? rawRows.length;
      const barcodeCount = Number(data?.barcodeCount ?? importedCount);
      const needsReviewCount = Number(data?.needsReviewCount || 0);
      const warningCount = Number(data?.warningCount || 0);
      setSuccess(
        `${importedCount} containers imported; ${barcodeCount} internal G8I barcode(s) assigned. ` +
          `${needsReviewCount} need review; ${warningCount} warning(s).`,
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

  const strategyCard = (value, title, description) => (
    <label
      className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
        locationStrategy === value
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="radio"
          name="location-strategy"
          value={value}
          checked={locationStrategy === value}
          onChange={(event) => setLocationStrategy(event.target.value)}
          className="mt-1"
        />
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-2 sm:p-4">
      <div className="mx-auto my-2 w-full max-w-[1500px] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Bulk Inventory Import
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {settings.profile_label || settings.profile_key || 'General'} · every new row receives a permanent internal G8I barcode
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close import"
          >
            <FiX size={20} />
          </button>
        </div>

        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-4 text-center transition-colors hover:border-blue-500 dark:border-slate-700"
          onClick={() => fileRef.current?.click()}
        >
          <FiUploadCloud className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
            Select Excel or CSV file
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Worksheet and header row are detected automatically, then mappings are confirmed below.
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
          <div className="mt-5 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Worksheet
                <select
                  value={sheetName}
                  onChange={handleSheetChange}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  {Object.keys(sheetMatrices).map((name) => (
                    <option key={name} value={name}>{name}</option>
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
            </div>

            <section>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  Inventory Placement
                </h3>
                <FiInfo className="text-slate-400" />
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {strategyCard(
                  'staging',
                  'Temporary / STAGING',
                  `Recommended for receiving. Import now, then scan a shelf and container to put stock away.${
                    stagingLocation ? ` STAGING barcode: ${stagingLocation.barcode}` : ''
                  }`,
                )}
                {strategyCard(
                  'file',
                  'Use File Locations',
                  'Use mapped Location values. Missing locations fall back to STAGING; combined locations require review.',
                )}
                {strategyCard(
                  'selected',
                  'One Selected Location',
                  'Place every imported container directly into one existing physical warehouse location.',
                )}
              </div>

              {locationStrategy === 'selected' && (
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Destination Location
                    <select
                      value={defaultLocationId}
                      onChange={(event) => setDefaultLocationId(event.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="">Select location</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.code} — {location.description || location.barcode}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saveDefaultLocation}
                      onChange={(event) => setSaveDefaultLocation(event.target.checked)}
                    />
                    Save as client default
                  </label>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 font-semibold text-slate-800 dark:text-white">
                Confirm Column Mapping
              </h3>
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="w-1/3 px-3 py-2 text-left">Spreadsheet Column</th>
                      <th className="w-1/3 px-3 py-2 text-left">Import As</th>
                      <th className="w-1/3 px-3 py-2 text-left">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header) => {
                      const calculated = getCalculatedImportField(header);
                      return (
                        <tr
                          key={header}
                          className="border-t border-slate-100 dark:border-slate-800"
                        >
                          <td className="px-3 py-2 font-medium">{header}</td>
                          <td className="px-3 py-2">
                            {calculated ? (
                              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300">
                                Calculated by app — {calculated.label}. Spreadsheet value is ignored.
                              </div>
                            ) : (
                              <select
                                value={mapping[header] || ''}
                                onChange={(event) =>
                                  handleMappingChange(header, event.target.value)
                                }
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                              >
                                <option value="">Ignore</option>
                                {fieldOptions.map((field) => (
                                  <option key={field.key} value={field.key}>
                                    {field.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="max-w-sm truncate px-3 py-2 text-slate-500">
                            {String(rawRows[0]?.[header] ?? '—')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-semibold text-slate-800 dark:text-white">
                Data Preview — {rawRows.length} row(s)
              </h3>
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                <table className="min-w-max text-xs">
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
            </section>

            <section className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 md:grid-cols-[auto_1fr] md:items-center">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveTemplate}
                  onChange={(event) => setSaveTemplate(event.target.checked)}
                />
                Save this mapping for future files
              </label>
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                disabled={!saveTemplate}
                placeholder="Import mapping name"
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
              />
            </section>

            {error && (
              <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                {success}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button variant="secondary" onClick={onClose} disabled={submitting}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={submitting || rawRows.length === 0}
              >
                {submitting ? 'Importing…' : `Import ${rawRows.length} Containers`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
