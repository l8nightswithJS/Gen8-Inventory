import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCamera, FiCheckCircle, FiFileText, FiPrinter, FiSearch, FiUploadCloud } from 'react-icons/fi';
import api from '../utils/axiosConfig';
import Button from '../components/ui/Button';

function normalizeClients(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.clients)) return payload.clients;
  return [];
}

function splitQuantities(text) {
  return String(text || '')
    .split(/[,;\n]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value >= 0);
}

function initialContainerText(line) {
  const count = Number(line?.container_count);
  const each = Number(line?.quantity_per_container);
  if (Number.isInteger(count) && count > 1 && Number.isFinite(each)) {
    return Array.from({ length: count }, () => String(each)).join(', ');
  }
  return line?.quantity == null ? '' : String(line.quantity);
}

function confidenceClass(value) {
  if (value === 'high') return 'text-emerald-700 dark:text-emerald-300';
  if (value === 'medium') return 'text-amber-700 dark:text-amber-300';
  if (value === 'low') return 'text-red-700 dark:text-red-300';
  return 'text-slate-500';
}

export default function ReceivingPage() {
  const fileRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [file, setFile] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [lines, setLines] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [receiptResult, setReceiptResult] = useState(null);

  useEffect(() => {
    api.get('/api/clients', { meta: { silent: true } })
      .then(({ data }) => {
        const next = normalizeClients(data);
        setClients(next);
        if (next.length === 1) setClientId(String(next[0].id));
      })
      .catch(() => setError('Could not load clients for receiving.'));
  }, []);

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === String(clientId)),
    [clients, clientId],
  );

  const updateHeader = (key, value) => {
    setExtraction((current) => ({ ...(current || {}), [key]: value }));
  };

  const updateLine = (index, patch) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const chooseFile = (nextFile) => {
    setFile(nextFile || null);
    setExtraction(null);
    setLines([]);
    setReceiptResult(null);
    setError('');
  };

  const extractDocument = async () => {
    if (!clientId) {
      setError('Select the client/material program first.');
      return;
    }
    if (!file) {
      setError('Take a photo or select a receiving document first.');
      return;
    }

    setExtracting(true);
    setError('');
    setReceiptResult(null);
    try {
      const form = new FormData();
      form.append('client_id', clientId);
      form.append('document', file);
      const { data } = await api.post('/api/receiving/extract', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setExtraction(data);
      setLines((data.lines || []).map((line) => ({
        ...line,
        selected_product_id:
          Number(line.matches?.[0]?.match_score) >= 90 ? String(line.matches[0].id) : 'new',
        container_quantities_text: initialContainerText(line),
        quality_status: 'pending_inspection',
      })));
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          'Document extraction failed. You can retry with a clearer photo or PDF.',
      );
    } finally {
      setExtracting(false);
    }
  };

  const receive = async () => {
    if (!extraction || lines.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const payloadLines = lines.map((line, index) => {
        const quantities = splitQuantities(line.container_quantities_text);
        if (!quantities.length) throw new Error(`Line ${index + 1}: enter at least one physical-container quantity.`);
        if (!line.part_number && line.selected_product_id === 'new') {
          throw new Error(`Line ${index + 1}: confirm a part/material number.`);
        }
        if (!line.uom) throw new Error(`Line ${index + 1}: confirm the UOM.`);
        const total = quantities.reduce((sum, quantity) => sum + quantity, 0);
        return {
          ...line,
          product_id: line.selected_product_id === 'new' ? null : Number(line.selected_product_id),
          product: line.selected_product_id === 'new'
            ? {
                part_number: line.part_number,
                name: line.name,
                description: line.description,
                manufacturer: line.manufacturer,
                manufacturer_part_number: line.manufacturer_part_number,
                vendor_item_number: line.vendor_item_number,
                profile_key: line.profile_hint,
                default_uom: line.uom,
                attributes: {
                  color: line.color || undefined,
                  additive: line.additive || undefined,
                },
              }
            : null,
          quantity: total,
          container_count: quantities.length,
          containers: quantities.map((quantity) => ({
            quantity,
            package_type: line.package_type || null,
          })),
          aliases: [line.source_text, line.manufacturer_part_number, line.vendor_item_number]
            .filter(Boolean),
        };
      });

      const { data } = await api.post('/api/receiving/receipts', {
        client_id: Number(clientId),
        supplier_name: extraction.supplier_name || null,
        po_number: extraction.po_number || null,
        packing_slip_number: extraction.packing_slip_number || null,
        coc_number: extraction.coc_number || null,
        received_date: extraction.received_date || null,
        document_ids: extraction.document_id ? [extraction.document_id] : [],
        extraction_metadata: {
          extraction_model: extraction.extraction_model,
          document_type: extraction.document_type,
        },
        receiving_location_code: 'RECEIVING-QC',
        lines: payloadLines,
      });
      setReceiptResult(data);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Receiving transaction failed.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const printCreatedLabels = async () => {
    const ids = (receiptResult?.containers || []).map((item) => item.id);
    if (!ids.length) return;
    setPrinting(true);
    setError('');
    try {
      await api.post('/api/labels/print/selected', { item_ids: ids });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          'Labels were created, but the printer could not be reached.',
      );
    } finally {
      setPrinting(false);
    }
  };

  const resetReceipt = () => {
    setFile(null);
    setExtraction(null);
    setLines([]);
    setReceiptResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Smart Receiving
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Capture a COC, packing slip, invoice, or supplier label; verify the extracted data; create one G8I per physical package.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {receiptResult ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-950/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <FiCheckCircle />
                <h2 className="text-xl font-bold">Receipt complete</h2>
              </div>
              <p className="mt-1 font-mono text-sm">{receiptResult.receipt?.receipt_number}</p>
              <p className="mt-1 text-sm">
                {receiptResult.container_count} physical container(s) created in {receiptResult.receiving_location?.code} as Pending Inspection.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={resetReceipt}>Receive Another</Button>
              <Button onClick={printCreatedLabels} disabled={printing} leftIcon={FiPrinter}>
                {printing ? 'Printing…' : `Print ${receiptResult.container_count} G8I Labels`}
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(receiptResult.containers || []).map((container) => (
              <div key={container.id} className="rounded-lg border border-emerald-200 bg-white p-4 dark:border-emerald-500/30 dark:bg-slate-900">
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{container.barcode}</p>
                <p className="text-sm font-semibold">{container.part_number}</p>
                <p className="text-sm text-slate-500">Lot {container.lot_number || 'N/A'}</p>
                <p className="mt-2 text-lg font-bold">{Number(container.initial_quantity)} {container.uom}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Pending Inspection</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 md:grid-cols-[1fr_2fr] md:items-end">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Client / Material Program
                <select
                  value={clientId}
                  onChange={(event) => {
                    setClientId(event.target.value);
                    setExtraction(null);
                    setLines([]);
                  }}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </label>

              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex min-h-24 w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 p-4 text-left hover:border-blue-500 dark:border-slate-700"
                >
                  {file ? <FiFileText className="h-8 w-8 text-blue-500" /> : <FiCamera className="h-8 w-8 text-slate-400" />}
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {file ? file.name : 'Take photo or upload document'}
                    </p>
                    <p className="text-xs text-slate-500">COC · packing slip · invoice · supplier label · PDF</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={extractDocument} disabled={!file || !clientId || extracting} leftIcon={FiUploadCloud}>
                {extracting ? 'Reading Document…' : 'Extract Receiving Data'}
              </Button>
            </div>
          </section>

          {extraction && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verify Receipt Header</h2>
                <p className="text-sm text-slate-500">Critical inventory fields are never committed until you confirm this screen.</p>
                {extraction.storage_warning && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{extraction.storage_warning}</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['supplier_name', 'Supplier'],
                  ['po_number', 'PO #'],
                  ['packing_slip_number', 'Packing Slip #'],
                  ['coc_number', 'COC #'],
                  ['received_date', 'Received Date'],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                    <input
                      value={extraction[key] || ''}
                      onChange={(event) => updateHeader(key, event.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-5">
                {lines.map((line, index) => {
                  const quantities = splitQuantities(line.container_quantities_text);
                  const total = quantities.reduce((sum, quantity) => sum + quantity, 0);
                  return (
                    <div key={index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white">Line {index + 1}</h3>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Pending Inspection</span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="text-sm font-medium md:col-span-2">
                          Product Match
                          <select
                            value={line.selected_product_id || 'new'}
                            onChange={(event) => updateLine(index, { selected_product_id: event.target.value })}
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                          >
                            {(line.matches || []).map((match) => (
                              <option key={match.id} value={match.id}>
                                {match.match_score}% · {match.part_number} · {match.name || match.description || 'Existing product'}
                              </option>
                            ))}
                            <option value="new">Create new product from this document</option>
                          </select>
                        </label>

                        <label className="text-sm font-medium">
                          Profile
                          <select
                            value={line.profile_hint || 'general'}
                            onChange={(event) => updateLine(index, { profile_hint: event.target.value })}
                            disabled={line.selected_product_id !== 'new'}
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 disabled:opacity-60"
                          >
                            <option value="resin">Resin / Raw Material</option>
                            <option value="molded_parts">Molded Parts</option>
                            <option value="genmark_components">Vendor / Client Components</option>
                            <option value="general">General Inventory</option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          ['part_number', 'Part / Material #'],
                          ['name', 'Name'],
                          ['manufacturer', 'Manufacturer'],
                          ['manufacturer_part_number', 'Mfr Part #'],
                          ['lot_number', 'Lot #'],
                          ['batch_number', 'Batch #'],
                          ['uom', 'UOM'],
                          ['package_type', 'Package Type'],
                        ].map(([key, label]) => (
                          <label key={key} className="text-sm font-medium">
                            {label}
                            <input
                              value={line[key] || ''}
                              onChange={(event) => updateLine(index, { [key]: event.target.value })}
                              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                            />
                            {['part_number', 'lot_number', 'uom'].includes(key) && line.confidence?.[key] && (
                              <span className={`text-xs ${confidenceClass(line.confidence[key])}`}>
                                OCR confidence: {line.confidence[key]}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
                        <label className="text-sm font-medium">
                          Physical Container Quantities
                          <textarea
                            rows={2}
                            value={line.container_quantities_text || ''}
                            onChange={(event) => updateLine(index, { container_quantities_text: event.target.value })}
                            placeholder="Example: 55, 55, 42"
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-800"
                          />
                          <span className="text-xs text-slate-500">One number = one physical bag, box, bin, drum, tray, or Gaylord = one new G8I.</span>
                        </label>
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                          <p className="text-xs uppercase text-slate-500">Will Create</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{quantities.length} G8I</p>
                          <p className="text-sm text-slate-500">Total {total || 0} {line.uom || ''}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="text-sm text-slate-500">
                  Destination: <strong>RECEIVING-QC</strong> · Quality: <strong>Pending Inspection</strong>
                </p>
                <Button onClick={receive} disabled={submitting || !selectedClient} leftIcon={FiCheckCircle}>
                  {submitting ? 'Creating Receipt…' : 'Receive & Create G8I Containers'}
                </Button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
