// src/components/EditItemModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';

const LABELS = {
  part_number: 'Part Number',
  description: 'Description',
  reorder_level: 'Reorder Level',
  reorder_qty: 'Reorder Qty',
  lead_times: 'Lead Times',
  type: 'Type',
  quantity: 'Qty On Hand',
  on_hand: 'Qty On Hand',
  qty_in_stock: 'Qty On Hand',
  stock: 'Qty On Hand',
  alert_acknowledged_at: 'Alert Acknowledged At',
};

const BASE_FIELDS = [
  'part_number',
  'description',
  'reorder_level',
  'reorder_qty',
  'lead_times',
  'type',
  'quantity',
  'on_hand',
  'qty_in_stock',
  'stock',
  'alert_acknowledged_at',
];

const titleFor = (key) =>
  LABELS[key] ||
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function EditItemModal({ open, item, onClose, onUpdated }) {
  // 1) attrs is derived once per item – safe to memoize
  const attrs = useMemo(() => item?.attributes || {}, [item]);

  // 2) stable, ordered set of keys shown in the form
  const keys = useMemo(() => {
    const union = new Set([...BASE_FIELDS, ...Object.keys(attrs || {})]);
    return Array.from(union);
  }, [attrs]);

  const [form, setForm] = useState({});

  // 3) Seed form when the *item* or the *set of keys* changes.
  //    (No need to depend on 'attrs' directly – 'keys' already depends on it.)
  useEffect(() => {
    if (!item) return;
    const seeded = {};
    keys.forEach((k) => {
      const v = attrs[k];
      // checkboxes & booleans: keep as boolean
      if (typeof v === 'boolean') {
        seeded[k] = v;
      } else if (v == null) {
        // show empty if missing so user can type one in
        seeded[k] = '';
      } else {
        // everything else as strings for inputs
        seeded[k] = String(v);
      }
    });
    setForm(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, keys]);

  if (!open || !item) return null;

  const onChange = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const onSave = async () => {
    try {
      // Build payload exactly as typed:
      // - numeric-like values will be coerced server-side by cleanAttributes
      // - empty string means "clear this field" (your backend now drops that key)
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
            // keep alert time visible but not editable
            const readOnly = key === 'alert_acknowledged_at';

            // boolean flag -> checkbox
            if (typeof attrs[key] === 'boolean') {
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
                  <span className="text-sm font-medium">{titleFor(key)}</span>
                </label>
              );
            }

            // everything else -> text input
            return (
              <div key={key} className="flex flex-col">
                <label className="mb-1 text-sm font-medium">
                  {titleFor(key)}
                </label>
                <input
                  className="rounded border px-3 py-2 outline-none focus:ring"
                  value={form[key] ?? ''}
                  onChange={(e) => onChange(key, e.target.value)}
                  placeholder={titleFor(key)}
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
