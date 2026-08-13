import { useMemo, useState } from 'react';
import { FiPrinter } from 'react-icons/fi';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

function parseNumberToken(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const plain = /^\d+(?:\.\d{1,3})?$/;
  const thousands = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,3})?$/;
  const normalized = thousands.test(raw)
    ? raw.replace(/,/g, '')
    : plain.test(raw)
      ? raw
      : null;
  if (normalized === null) return null;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseQuantities(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];

  // Semicolons/newlines are unambiguous list delimiters and allow values such
  // as "1,000; 500". If the entire text is one valid number, keep it as one
  // container. Otherwise commas represent separate small-container quantities.
  const explicitSegments = raw.split(/[;\n]+/).map((value) => value.trim()).filter(Boolean);
  if (explicitSegments.length > 1) {
    const parsed = explicitSegments.map(parseNumberToken);
    return parsed.every((value) => value !== null) ? parsed : [];
  }

  const single = parseNumberToken(raw);
  if (single !== null) return [single];

  const commaSegments = raw.split(',').map((value) => value.trim()).filter(Boolean);
  const parsed = commaSegments.map((value) => {
    if (!/^\d+(?:\.\d{1,3})?$/.test(value)) return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  });
  return parsed.length && parsed.every((value) => value !== null) ? parsed : [];
}

export default function RepackContainerModal({ item, onClose, onRepacked }) {
  const balances = useMemo(() => {
    const inventoryLevels = item?.inventory_levels;

    return Array.isArray(inventoryLevels)
      ? inventoryLevels.filter(
        (balance) => Number(balance.quantity) > 0,
      )
      : [];
  }, [item?.inventory_levels]);
  const [sourceLocationId, setSourceLocationId] = useState(
    balances.length === 1 ? String(balances[0].location_id) : '',
  );
  const selectedBalance = useMemo(
    () => balances.find((balance) => String(balance.location_id) === sourceLocationId),
    [balances, sourceLocationId],
  );
  const [quantitiesText, setQuantitiesText] = useState('');
  const [packageType, setPackageType] = useState(item?.package_type || '');
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const quantities = parseQuantities(quantitiesText);
  const total = quantities.reduce((sum, quantity) => sum + quantity, 0);
  const available = Number(selectedBalance?.quantity || 0);
  const remaining = Math.max(available - total, 0);

  const submit = async (event) => {
    event.preventDefault();
    if (!sourceLocationId && balances.length > 1) {
      setError('Select the source location first.');
      return;
    }
    if (!quantities.length) {
      setError('Enter valid positive quantities for each new physical container.');
      return;
    }
    if (total > available + 0.0005) {
      setError(`New containers total ${total}, but only ${available} ${item.uom || ''} is available.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/api/items/${item.id}/repack`, {
        source_location_id: sourceLocationId ? Number(sourceLocationId) : null,
        containers: quantities.map((quantity) => ({
          quantity,
          package_type: packageType || null,
        })),
      });
      setResult(data);
      await onRepacked?.();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Split / repack failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const printLabels = async () => {
    const ids = (result?.containers || []).map((container) => container.id);
    if (!ids.length) return;
    setPrinting(true);
    setError('');
    try {
      await api.post('/api/labels/print/selected', { item_ids: ids });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
        'Containers were created, but the printer could not be reached.',
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <BaseModal
      isOpen={!!item}
      onClose={onClose}
      title="Split / Repack Physical Container"
      size="max-w-2xl"
      footer={
        result ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button onClick={printLabels} disabled={printing} leftIcon={FiPrinter}>
              {printing ? 'Printing…' : `Print ${result.containers?.length || 0} New G8I Labels`}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" form="repack-container-form" disabled={submitting || !quantities.length}>
              {submitting ? 'Creating…' : `Create ${quantities.length || 0} New Container(s)`}
            </Button>
          </div>
        )
      }
    >
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

      <div className="mb-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
        <p className="font-semibold">{item.name || item.description || item.part_number}</p>
        <p className="font-mono text-xs text-slate-500">{item.barcode}</p>
        <p className="mt-1 text-sm text-slate-500">Part {item.part_number} · Lot {item.lot_number || 'N/A'}</p>
      </div>

      {result ? (
        <div>
          <p className="mb-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">{result.message}</p>
          <p className="mb-4 text-sm">Source remaining: <strong>{result.source?.remaining_quantity} {item.uom || ''}</strong> at {result.source?.location}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(result.containers || []).map((container) => (
              <div key={container.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-mono font-bold">{container.barcode}</p>
                <p className="text-sm">{Number(container.initial_quantity)} {container.uom}</p>
                <p className="text-xs text-slate-500">STAGING · inherits part, lot, and quality status</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form id="repack-container-form" onSubmit={submit} className="space-y-4">
          {balances.length > 1 && (
            <label className="block text-sm font-medium">
              Source Location Balance
              <select
                value={sourceLocationId}
                onChange={(event) => setSourceLocationId(event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                required
              >
                <option value="">Select source</option>
                {balances.map((balance) => (
                  <option key={balance.location_id} value={balance.location_id}>
                    {balance.location_code} — {balance.quantity} {item.uom || ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">Available Source</p>
              <p className="text-xl font-bold">{available} {item.uom || ''}</p>
            </div>
            <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">Repacked</p>
              <p className="text-xl font-bold">{total} {item.uom || ''}</p>
            </div>
            <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">Source Remaining</p>
              <p className="text-xl font-bold">{remaining} {item.uom || ''}</p>
            </div>
          </div>

          <label className="block text-sm font-medium">
            New Physical Container Quantities
            <textarea
              rows={3}
              value={quantitiesText}
              onChange={(event) => setQuantitiesText(event.target.value)}
              placeholder="Resin: 55, 55, 42\nParts: 161, 161, 100\nThousands: 1,000; 500"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-800"
              required
            />
            <span className="text-xs text-slate-500">Each positive number creates a separate physical container and permanent new G8I. Use semicolons or new lines when a quantity itself uses a thousands comma.</span>
          </label>

          <label className="block text-sm font-medium">
            Package Type
            <input
              value={packageType}
              onChange={(event) => setPackageType(event.target.value)}
              placeholder="Bin, box, bag, tray, Gaylord…"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
        </form>
      )}
    </BaseModal>
  );
}
