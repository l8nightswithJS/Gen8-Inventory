// src/components/EditItemModal.jsx
import { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';

const LABELS = {
  part_number: 'Part Number',
  description: 'Description',
  reorder_level: 'Reorder Level',
  reorder_qty: 'Reorder Qty',
  lead_times: 'Lead Times',
  type: 'Type',
  alert_acknowledged_at: 'Alert Acknowledged At',
  barcode: 'Barcode',
};

const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];

const titleFor = (key) =>
  LABELS[key] ||
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function EditItemModal({ open, item, onClose, onUpdated }) {
  const attrs = useMemo(() => item?.attributes || {}, [item]);

  // choose a single quantity key to display
  const qtyKey = useMemo(
    () => QTY_KEYS.find((k) => Object.hasOwn(attrs, k)),
    [attrs],
  );

  // final, ordered keys for the form (no duplicates)
  const keys = useMemo(() => {
    if (!attrs) return [];
    const base = [
      'part_number',
      'description',
      'reorder_level',
      'reorder_qty',
      'lead_times',
      'type',
      // only one qty field, if present
      ...(qtyKey ? [qtyKey] : []),
      'alert_acknowledged_at',
      // include barcode if present (trigger will add one after insert)
      ...(Object.hasOwn(attrs, 'barcode') ? ['barcode'] : []),
    ];

    // include any additional custom keys not already covered
    const extra = Object.keys(attrs).filter(
      (k) => !base.includes(k) && !QTY_KEYS.includes(k),
    );

    // final order: base first, then extras alphabetically
    return [...base, ...extra.sort()];
  }, [attrs, qtyKey]);

  const [form, setForm] = useState({});

  useEffect(() => {
    if (!item) return;
    const seeded = {};
    keys.forEach((k) => {
      const v = attrs[k];
      if (typeof v === 'boolean') seeded[k] = v;
      else if (v == null) seeded[k] = '';
      else seeded[k] = String(v);
    });
    setForm(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, keys]);

  if (!open || !item) return null;

  const onChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const onSave = async () => {
    try {
      const payload = { attributes: { ...form } };
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
          {keys.map((key) => {
            const readOnly = key === 'alert_acknowledged_at';
            const isBool =
              typeof attrs[key] === 'boolean' || typeof form[key] === 'boolean';

            const label =
              qtyKey && key === qtyKey ? 'Qty On Hand' : titleFor(key);

            if (isBool) {
              return (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded border p-2"
                >
                  <input
                    type="checkbox"
                    checked={!!form[key]}
                    onChange={(e) => onChange(key, e.target.checked)}
                    disabled={readOnly}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              );
            }

            return (
              <div key={key} className="flex flex-col">
                <label className="mb-1 text-sm font-medium">{label}</label>
                <input
                  className="rounded border px-3 py-2 outline-none focus:ring"
                  value={form[key] ?? ''}
                  onChange={(e) => onChange(key, e.target.value)}
                  placeholder={label}
                  readOnly={readOnly}
                />
              </div>
            );
          })}
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
