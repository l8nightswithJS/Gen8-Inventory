// src/components/EditItemModal.jsx
import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

// Added the missing QTY_KEYS constant
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

export default function EditItemModal({
  item,
  schema = [],
  onClose,
  onUpdated,
  isLotTrackingLocked,
}) {
  const [form, setForm] = useState({});

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
    try {
      const payload = { attributes: { ...form } };
      if (!payload.attributes.has_lot) {
        delete payload.attributes.lot_number;
      }
      if (!payload.attributes.alert_enabled) {
        delete payload.attributes.reorder_level;
        delete payload.attributes.reorder_qty;
      }

      await axios.put(`/api/items/${item.id}?merge=true`, payload);
      onUpdated?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert('Failed to save item.');
    }
  };

  const humanize = (key) => {
    if (QTY_KEYS.has(key)) return 'On Hand';
    return titleFor(key);
  };

  return (
    <BaseModal isOpen={!!item} onClose={onClose} title="Edit Inventory Item">
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
            {/* Added htmlFor and id to link the label and input */}
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
            className="h-4 w-4 rounded"
          />
          <label htmlFor="fld-alert_enabled" className="text-sm text-gray-700">
            Enable Low-Stock Alert
          </label>
        </div>
        {form.alert_enabled && (
          <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {/* Added htmlFor and id to link the label and input */}
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
              />
            </div>
            <div>
              {/* Added htmlFor and id to link the label and input */}
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
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave}>
          Save
        </Button>
      </div>
    </BaseModal>
  );
}
