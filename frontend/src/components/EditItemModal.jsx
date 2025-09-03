// frontend/src/components/EditItemModal.jsx
import { useEffect, useState } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function EditItemModal({
  item,
  schema = [],
  onClose,
  onUpdated,
  isLotTrackingLocked,
  api, // ✅ inventoryApi instance passed from ClientPage.jsx
}) {
  if (!api) {
    throw new Error('❌ EditItemModal requires an `api` instance prop.');
  }

  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const QTY_KEYS = new Set(['on_hand', 'quantity', 'qty_in_stock', 'stock']);
  const NUMERIC_KEYS = new Set([
    'on_hand',
    'quantity',
    'qty_in_stock',
    'stock',
    'reorder_level',
    'reorder_qty',
  ]);
  const SYSTEM_KEYS = new Set([
    'has_lot',
    'lot_number',
    'alert_enabled',
    'reorder_level',
    'reorder_qty',
  ]);

  const titleFor = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    if (!item) return;
    const attrs = item.attributes || {};
    const seeded = { ...attrs };

    if (isLotTrackingLocked) {
      seeded.has_lot = true;
    } else if (typeof seeded.has_lot === 'undefined') {
      seeded.has_lot = false;
    }
    if (typeof seeded.alert_enabled === 'undefined') {
      seeded.alert_enabled = true;
    }

    setForm(seeded);
  }, [item, isLotTrackingLocked]);

  const onChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const handleCheckbox = (key, checked) =>
    setForm((f) => ({ ...f, [key]: checked }));

  const onSave = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = { attributes: { ...form } };

      // Clean up unwanted values
      if (!payload.attributes.has_lot) {
        delete payload.attributes.lot_number;
      }
      if (!payload.attributes.alert_enabled) {
        delete payload.attributes.reorder_level;
        delete payload.attributes.reorder_qty;
      }

      // Normalize numeric values (remove empty strings)
      Object.keys(payload.attributes).forEach((k) => {
        if (NUMERIC_KEYS.has(k) && payload.attributes[k] === '') {
          delete payload.attributes[k];
        }
      });

      await api.put(`/api/items/${item.id}?merge=true`, payload);
      onUpdated?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || 'Failed to save item.');
    } finally {
      setSubmitting(false);
    }
  };

  const humanize = (key) => {
    if (QTY_KEYS.has(key)) return 'On Hand';
    return titleFor(key);
  };

  return (
    <BaseModal isOpen={!!item} onClose={onClose} title="Edit Inventory Item">
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {schema
          .filter((key) => !SYSTEM_KEYS.has(key))
          .map((key) => (
            <div key={key}>
              <label className="mb-1 text-sm font-medium">
                {humanize(key)}
              </label>
              <input
                className="rounded border px-3 py-2 outline-none focus:ring w-full"
                value={form[key] ?? ''}
                onChange={(e) => onChange(key, e.target.value)}
                type={NUMERIC_KEYS.has(key) ? 'number' : 'text'}
                disabled={submitting}
              />
            </div>
          ))}
      </div>

      <div className="mt-4 pt-4 border-t space-y-4">
        <h4 className="text-base font-semibold text-gray-800">
          Tracking & Alerts
        </h4>
        <div className="flex items-center space-x-2">
          <input
            id="fld-has_lot"
            type="checkbox"
            name="has_lot"
            checked={!!form.has_lot}
            onChange={(e) => handleCheckbox('has_lot', e.target.checked)}
            disabled={isLotTrackingLocked || submitting}
            className="h-4 w-4 rounded disabled:opacity-70"
          />
          <label
            htmlFor="fld-has_lot"
            className={`text-sm text-gray-700 ${
              isLotTrackingLocked ? 'opacity-70' : ''
            }`}
          >
            Track Lot Number
          </label>
        </div>
        {form.has_lot && (
          <div className="pl-6">
            <label
              htmlFor="edit-lot_number"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Lot Number
            </label>
            <input
              id="edit-lot_number"
              name="lot_number"
              value={form.lot_number ?? ''}
              onChange={(e) => onChange('lot_number', e.target.value)}
              className="w-full sm:w-1/2 border px-3 py-2 rounded border-gray-300"
              disabled={submitting}
            />
          </div>
        )}
        <div className="flex items-center space-x-2">
          <input
            id="fld-alert_enabled"
            type="checkbox"
            name="alert_enabled"
            checked={!!form.alert_enabled}
            onChange={(e) => handleCheckbox('alert_enabled', e.target.checked)}
            disabled={submitting}
            className="h-4 w-4 rounded"
          />
          <label htmlFor="fld-alert_enabled" className="text-sm text-gray-700">
            Enable Low-Stock Alert
          </label>
        </div>
        {form.alert_enabled && (
          <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-reorder_level"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Reorder Level
              </label>
              <input
                id="edit-reorder_level"
                name="reorder_level"
                type="number"
                min="0"
                value={form.reorder_level ?? ''}
                onChange={(e) => onChange('reorder_level', e.target.value)}
                className="w-full border px-3 py-2 rounded border-gray-300"
                disabled={submitting}
              />
            </div>
            <div>
              <label
                htmlFor="edit-reorder_qty"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Reorder Quantity
              </label>
              <input
                id="edit-reorder_qty"
                name="reorder_qty"
                type="number"
                min="0"
                value={form.reorder_qty ?? ''}
                onChange={(e) => onChange('reorder_qty', e.target.value)}
                className="w-full border px-3 py-2 rounded border-gray-300"
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </BaseModal>
  );
}
