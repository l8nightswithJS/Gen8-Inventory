import { useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function TransferInventoryModal({
  item,
  destination,
  onClose,
  onTransferred,
  onRepack,
}) {
  const balances = Array.isArray(item?.inventory_levels) ? item.inventory_levels : [];
  const sourceOptions = balances.filter(
    (balance) => Number(balance.quantity) > 0 && Number(balance.location_id) !== Number(destination?.id),
  );
  const [sourceLocationId, setSourceLocationId] = useState(
    sourceOptions.length === 1 ? String(sourceOptions[0].location_id) : '',
  );
  const selectedSource = useMemo(
    () => sourceOptions.find(
      (balance) => String(balance.location_id) === sourceLocationId,
    ),
    [sourceOptions, sourceLocationId],
  );
  const [actualQuantity, setActualQuantity] = useState(
    sourceOptions.length === 1 ? String(sourceOptions[0].quantity) : '',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const available = Number(selectedSource?.quantity || 0);
  const displayName = item?.name || item?.description || item?.part_number || 'Container';

  const changeSource = (value) => {
    setSourceLocationId(value);
    const balance = sourceOptions.find((entry) => String(entry.location_id) === String(value));
    setActualQuantity(balance ? String(balance.quantity) : '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!destination?.id) return;
    if (sourceOptions.length > 1 && !sourceLocationId) {
      setError('Select the source location for this container.');
      return;
    }
    const measured = Number(actualQuantity);
    if (!Number.isFinite(measured) || measured <= 0) {
      setError('Enter the actual quantity remaining in this physical container.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/items/transfer', {
        item_id: item.id,
        from_location_id: sourceLocationId ? Number(sourceLocationId) : null,
        to_location_id: Number(destination.id),
        move_all: true,
        actual_remaining_quantity: actualQuantity,
        reason: 'Barcode-directed whole-container put-away / relocation',
      });
      await onTransferred?.();
      onClose?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || 'Failed to move physical container.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={!!item && !!destination}
      onClose={onClose}
      title="Move Physical Container"
      size="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {onRepack && (
            <Button variant="secondary" onClick={() => onRepack(item)} disabled={submitting}>
              Split / Repack Instead
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="transfer-inventory-form"
            disabled={submitting || sourceOptions.length === 0}
          >
            {submitting ? 'Moving…' : `Move Container to ${destination.code}`}
          </Button>
        </div>
      }
    >
      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      <form id="transfer-inventory-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="font-semibold text-slate-900 dark:text-white">{displayName}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {item.part_number || 'No part number'}
            {item.lot_number ? ` · Lot ${item.lot_number}` : ''}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">{item.barcode}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            From
            <select
              value={sourceLocationId}
              onChange={(event) => changeSource(event.target.value)}
              required={sourceOptions.length > 1}
              disabled={sourceOptions.length <= 1}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            >
              {sourceOptions.length > 1 && <option value="">Select source</option>}
              {sourceOptions.map((balance) => (
                <option key={balance.location_id} value={balance.location_id}>
                  {balance.location_code} — {balance.quantity} {item.uom || ''}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            To
            <div className="mt-1 rounded border border-blue-300 bg-blue-50 px-3 py-2 font-semibold text-blue-800 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-300">
              {destination.code}
            </div>
          </div>
        </div>

        {sourceOptions.length === 0 ? (
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300">
            This container has no positive balance outside the selected destination.
          </p>
        ) : (
          <>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Actual Quantity Remaining in This Container
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={actualQuantity}
                onChange={(event) => setActualQuantity(event.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-lg font-semibold dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-xs text-slate-500">
                Current system quantity: {available} {item.uom || ''}. If you weighed/count this container, enter the actual value; the app records the adjustment and moves the whole remaining container in one submit.
              </span>
            </label>

            <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/20 dark:text-blue-300">
              One G8I represents one physical container. To leave some material here and create another bin/box, use <strong>Split / Repack</strong> so the new physical container receives its own G8I.
            </div>
          </>
        )}
      </form>
    </BaseModal>
  );
}
