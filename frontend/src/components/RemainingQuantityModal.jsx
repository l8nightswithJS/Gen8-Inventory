import { useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function RemainingQuantityModal({
  item,
  preferredLocation = null,
  onClose,
  onUpdated,
}) {
  const balances = useMemo(() => {
    const inventoryLevels = item?.inventory_levels;

    return Array.isArray(inventoryLevels)
      ? inventoryLevels.filter(
        (balance) => Number(balance.quantity) > 0,
      )
      : [];
  }, [item?.inventory_levels]);
  const initialLocationId =
    preferredLocation && balances.some(
      (balance) => Number(balance.location_id) === Number(preferredLocation.id),
    )
      ? String(preferredLocation.id)
      : balances.length === 1
        ? String(balances[0].location_id)
        : '';

  const [locationId, setLocationId] = useState(initialLocationId);
  const selectedBalance = useMemo(
    () => balances.find((balance) => String(balance.location_id) === locationId),
    [balances, locationId],
  );
  const currentQuantity = Number(selectedBalance?.quantity || 0);
  const [remaining, setRemaining] = useState(
    selectedBalance ? String(selectedBalance.quantity) : '',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numericRemaining = Number(remaining);
  const consumed =
    Number.isFinite(numericRemaining) && numericRemaining < currentQuantity
      ? currentQuantity - numericRemaining
      : 0;

  const changeLocation = (value) => {
    setLocationId(value);
    const balance = balances.find(
      (entry) => String(entry.location_id) === String(value),
    );
    setRemaining(balance ? String(balance.quantity) : '');
  };

  const submitRemaining = async (value) => {
    if (!locationId && balances.length > 1) {
      setError('Select which location balance you are updating.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/items/${item.id}/remaining`, {
        location_id: locationId ? Number(locationId) : null,
        remaining_quantity: value,
        reason: Number(value) === 0
          ? 'Container emptied during warehouse use'
          : 'Remaining quantity updated after material use',
      });
      await onUpdated?.();
      onClose?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
        'Failed to update remaining quantity.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitRemaining(remaining);
  };

  const displayName = item?.name || item?.description || item?.part_number || 'Container';

  return (
    <BaseModal
      isOpen={!!item}
      onClose={onClose}
      title="Update Remaining Quantity"
      size="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="danger"
            onClick={() => submitRemaining(0)}
            disabled={submitting || balances.length === 0}
          >
            Mark Empty
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="remaining-quantity-form"
            disabled={submitting || balances.length === 0}
          >
            {submitting ? 'Saving…' : 'Save Remaining'}
          </Button>
        </div>
      }
    >
      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mb-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
        <p className="font-semibold text-slate-900 dark:text-white">{displayName}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {item.part_number || 'No part number'}
          {item.lot_number ? ` · Lot ${item.lot_number}` : ''}
        </p>
        <p className="mt-1 font-mono text-xs text-slate-500">{item.barcode}</p>
      </div>

      {balances.length === 0 ? (
        <p className="rounded border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          This container has no active inventory balance. It may already be empty.
        </p>
      ) : (
        <form id="remaining-quantity-form" onSubmit={handleSubmit} className="space-y-4">
          {balances.length > 1 && (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Location Balance
              <select
                value={locationId}
                onChange={(event) => changeLocation(event.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Select location</option>
                {balances.map((balance) => (
                  <option key={balance.location_id} value={balance.location_id}>
                    {balance.location_code} — {balance.quantity} {item.uom || ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedBalance && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">Current</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentQuantity} {item.uom || ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedBalance.location_code}
                </p>
              </div>
              <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">Consumed by this update</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {consumed.toFixed(3).replace(/\.000$/, '')} {item.uom || ''}
                </p>
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Remaining Quantity
            <input
              type="number"
              min="0"
              step="0.001"
              value={remaining}
              onChange={(event) => setRemaining(event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-lg font-semibold dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
        </form>
      )}
    </BaseModal>
  );
}
