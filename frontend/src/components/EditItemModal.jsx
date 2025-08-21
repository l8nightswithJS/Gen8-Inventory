// src/components/EditItemModal.jsx
import { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';

const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];
const SYSTEM_KEYS = new Set([
  'has_lot',
  'lot_number',
  'alert_enabled',
  'low_stock_threshold',
  'reorder_level',
  'reorder_qty',
]);

const titleFor = (key) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function EditItemModal({
  open,
  item,
  onClose,
  onUpdated,
  isLotTrackingLocked,
}) {
  const attrs = useMemo(() => item?.attributes || {}, [item]);

  const keys = useMemo(() => {
    const all = Object.keys(attrs);
    const dynamicKeys = all.filter(
      (k) => !QTY_KEYS.includes(k) && !SYSTEM_KEYS.has(k),
    );
    const qtyKey = QTY_KEYS.find((k) => all.includes(k));
    if (qtyKey) dynamicKeys.unshift(qtyKey);
    return dynamicKeys;
  }, [attrs]);

  const [form, setForm] = useState({});

  useEffect(() => {
    if (!item) return;
    const seeded = { ...attrs };

    if (isLotTrackingLocked) {
      seeded.has_lot = true;
    } else if (typeof seeded.has_lot === 'undefined') {
      seeded.has_lot = false;
    }
    if (typeof seeded.alert_enabled === 'undefined') {
      seeded.alert_enabled = true; // Default to on
    }

    setForm(seeded);
  }, [item, attrs, isLotTrackingLocked]);

  if (!open || !item) return null;

  const onChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const handleCheckbox = (key, checked) =>
    setForm((f) => ({ ...f, [key]: checked }));

  const onSave = async () => {
    try {
      const payload = { attributes: { ...form } };
      if (!payload.attributes.has_lot) {
        delete payload.attributes.lot_number;
      }
      if (!payload.attributes.alert_enabled) {
        delete payload.attributes.reorder_level;
        delete payload.attributes.reorder_qty;
        delete payload.attributes.low_stock_threshold;
      }

      await axios.put(`/api/items/${item.id}?merge=true`, payload);
      onUpdated?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert('Failed to save item.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Inventory Item</h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {keys.map((key) => (
            <div key={key} className="flex flex-col">
              <label className="mb-1 text-sm font-medium">
                {titleFor(key)}
              </label>
              <input
                className="rounded border px-3 py-2 outline-none focus:ring"
                value={form[key] ?? ''}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={titleFor(key)}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t space-y-4">
          <h4 className="text-base font-semibold text-gray-800">
            Tracking & Alerts
          </h4>
          {/* Lot Number Section */}
          <div className="flex items-center space-x-2">
            <input
              id="fld-has_lot"
              type="checkbox"
              name="has_lot"
              checked={!!form.has_lot}
              onChange={(e) => handleCheckbox('has_lot', e.target.checked)}
              disabled={isLotTrackingLocked}
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
                htmlFor="fld-lot_number"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Lot Number
              </label>
              <input
                id="fld-lot_number"
                name="lot_number"
                value={form.lot_number ?? ''}
                onChange={(e) => onChange('lot_number', e.target.value)}
                className="w-full sm:w-1/2 border px-3 py-2 rounded border-gray-300"
              />
            </div>
          )}
          {/* Low Stock Alert Section */}
          <div className="flex items-center space-x-2">
            <input
              id="fld-alert_enabled"
              type="checkbox"
              name="alert_enabled"
              checked={!!form.alert_enabled}
              onChange={(e) =>
                handleCheckbox('alert_enabled', e.target.checked)
              }
              className="h-4 w-4 rounded"
            />
            <label
              htmlFor="fld-alert_enabled"
              className="text-sm text-gray-700"
            >
              Enable Low-Stock Alert
            </label>
          </div>
          {form.alert_enabled && (
            <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fld-reorder_level"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Reorder Level
                </label>
                <input
                  id="fld-reorder_level"
                  name="reorder_level"
                  type="number"
                  min="0"
                  value={form.reorder_level ?? ''}
                  onChange={(e) => onChange('reorder_level', e.target.value)}
                  className="w-full border px-3 py-2 rounded border-gray-300"
                />
              </div>
              <div>
                <label
                  htmlFor="fld-reorder_qty"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Reorder Quantity
                </label>
                <input
                  id="fld-reorder_qty"
                  name="reorder_qty"
                  type="number"
                  min="0"
                  value={form.reorder_qty ?? ''}
                  onChange={(e) => onChange('reorder_qty', e.target.value)}
                  className="w-full border px-3 py-2 rounded border-gray-300"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
