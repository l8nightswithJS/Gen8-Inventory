import { useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function TransferInventoryModal({
  item,
  destination,
  onClose,
  onTransferred,
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
  const [moveAll, setMoveAll] = useState(true);
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const available = Number(selectedSource?.quantity || 0);
  const displayName = item?.name || item?.description || item?.part_number || 'Container';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!destination?.id) return;
    if (sourceOptions.length > 1 && !sourceLocationId) {
      setError('Select the source location for this container.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/items/transfer', {
        item_id: item.id,
        from_location_id: sourceLocationId ? Number(sourceLocationId) : null,
        to_location_id: Number(destination.id),
        move_all: moveAll,
        quantity: moveAll ? null : quantity,
        reason: 'Barcode-directed warehouse put-away / transfer',
      });
      await onTransferred?.();
      onClose?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || 'Failed to move inventory.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={!!item && !!destination}
      onClose={onClose}
      title="Move Inventory Container"
      size="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="transfer-inventory-form"
            disabled={submitting || sourceOptions.length === 0}
          >
            {submitting ? 'Moving…' : 'Confirm Move'}
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
          <p className="mt-1 font-mono text-xs text-slate-500">
            {item.barcode}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            From
            <select
              value={sourceLocationId}
              onChange={(event) => setSourceLocationId(event.target.value)}
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
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={moveAll}
                onChange={(event) => setMoveAll(event.target.checked)}
              />
              Move entire available balance ({available} {item.uom || ''})
            </label>

            {!moveAll && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Quantity to Move
                <input
                  type="number"
                  min="0.001"
                  max={available || undefined}
                  step="0.001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
            )}
          </div>
        )}
      </form>
    </BaseModal>
  );
}
