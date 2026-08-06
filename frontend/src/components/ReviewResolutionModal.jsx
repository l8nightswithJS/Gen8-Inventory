import { useEffect, useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const emptyAllocation = () => ({ location_id: '', quantity: '' });

export default function ReviewResolutionModal({
  item,
  onClose,
  onResolved,
}) {
  const [locations, setLocations] = useState([]);
  const [allocations, setAllocations] = useState([emptyAllocation()]);
  const [uom, setUom] = useState(item?.uom || '');
  const [error, setError] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        const { data } = await api.get('/api/locations');
        if (active) setLocations(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.message ||
              'Failed to load warehouse locations.',
          );
        }
      } finally {
        if (active) setLoadingLocations(false);
      }
    };

    loadLocations();
    return () => {
      active = false;
    };
  }, []);

  const reviewIssues = Array.isArray(item?.review_issues)
    ? item.review_issues
    : [];

  const totalQuantity = useMemo(
    () =>
      allocations.reduce((sum, allocation) => {
        const value = Number(allocation.quantity);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0),
    [allocations],
  );

  const updateAllocation = (index, field, value) => {
    setAllocations((previous) =>
      previous.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? { ...allocation, [field]: value }
          : allocation,
      ),
    );
  };

  const addAllocation = () => {
    setAllocations((previous) => [...previous, emptyAllocation()]);
  };

  const removeAllocation = (index) => {
    setAllocations((previous) =>
      previous.length === 1
        ? previous
        : previous.filter((_, allocationIndex) => allocationIndex !== index),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        uom: uom.trim() || null,
        allocations: allocations.map((allocation) => ({
          location_id: Number(allocation.location_id),
          quantity: allocation.quantity,
        })),
      };

      await api.post(`/api/items/${item.id}/review/resolve`, payload);
      await onResolved?.();
      onClose?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          'Failed to resolve inventory review.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={!!item}
      onClose={onClose}
      title={`Resolve Inventory Review: ${
        item?.part_number || item?.name || 'Item'
      }`}
      size="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="review-resolution-form"
            variant="primary"
            disabled={submitting || loadingLocations}
          >
            {submitting ? 'Resolving…' : 'Save Resolved Inventory'}
          </Button>
        </div>
      }
    >
      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      {reviewIssues.length > 0 && (
        <div className="mb-5 rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 dark:border-orange-500/30 dark:bg-orange-900/20 dark:text-orange-200">
          <p className="font-semibold">Imported values requiring resolution</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {reviewIssues.map((issue, index) => (
              <li key={`${issue.type || 'issue'}-${index}`}>
                {issue.message || 'Imported data requires review.'}
                {issue.source_value ? ` Source: ${issue.source_value}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        id="review-resolution-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="review-uom"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Unit of Measure
          </label>
          <input
            id="review-uom"
            value={uom}
            onChange={(event) => setUom(event.target.value)}
            placeholder="lb, kg, pieces, boxes, bags"
            maxLength={40}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-white">
                Location Allocations
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assign the official quantity stored at each physical location.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addAllocation}
            >
              Add Location
            </Button>
          </div>

          <div className="space-y-3">
            {allocations.map((allocation, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded border border-slate-200 p-3 sm:grid-cols-[1fr_10rem_auto] dark:border-slate-700"
              >
                <div>
                  <label
                    htmlFor={`review-location-${index}`}
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Location
                  </label>
                  <select
                    id={`review-location-${index}`}
                    required
                    value={allocation.location_id}
                    onChange={(event) =>
                      updateAllocation(index, 'location_id', event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code}
                        {location.description ? ` — ${location.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`review-quantity-${index}`}
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Quantity
                  </label>
                  <input
                    id={`review-quantity-${index}`}
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={allocation.quantity}
                    onChange={(event) =>
                      updateAllocation(index, 'quantity', event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={allocations.length === 1}
                    onClick={() => removeAllocation(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Resolved total: <strong>{totalQuantity}</strong>
          {uom.trim() ? ` ${uom.trim()}` : ''}
        </div>
      </form>
    </BaseModal>
  );
}
