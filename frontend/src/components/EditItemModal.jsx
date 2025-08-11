// src/components/EditItemModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';

// Show these no matter what (even if they weren't present at import)
const BASE_FIELDS = [
  'part_number',
  'description',
  'reorder_level',
  'reorder_qty',
  'lead_times',
  'type',
  'quantity', // shown as "Qty On Hand"
  'alert_acknowledged_at', // to view/edit/clear the ack timestamp
  'low_stock_threshold',
  'location',
  'lot_number',
  'has_lot',
];

const LABELS = {
  part_number: 'Part Number',
  description: 'Description',
  reorder_level: 'Reorder Level',
  reorder_qty: 'Reorder Qty',
  lead_times: 'Lead Times',
  type: 'Type',
  quantity: 'Qty On Hand',
  alert_acknowledged_at: 'Alert Acknowledged At',
  low_stock_threshold: 'Low Stock Threshold',
  location: 'Location',
  lot_number: 'Lot Number',
  has_lot: 'Has Lot',
};

function titleFor(key) {
  return (
    LABELS[key] ||
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function EditItemModal({ open, item, onClose, onUpdated }) {
  const attrs = item?.attributes || {};

  // union of existing keys + base set, stable order
  const keys = useMemo(() => {
    const union = new Set([...BASE_FIELDS, ...Object.keys(attrs || {})]);
    return Array.from(union);
  }, [attrs]);

  const [form, setForm] = useState({});

  useEffect(() => {
    // seed form with existing values or ""
    const seeded = {};
    keys.forEach((k) => {
      // Normalize booleans to checkbox, everything else to string
      const v = attrs[k];
      if (typeof v === 'boolean') {
        seeded[k] = v;
      } else if (v == null) {
        seeded[k] = '';
      } else {
        seeded[k] = String(v);
      }
    });
    setForm(seeded);
  }, [item, keys]); // re-run when switching rows

  if (!open || !item) return null;

  const onChange = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const save = async () => {
    // Build payload:
    // - send every key on the form so missing-at-import fields are persisted
    // - if the user cleared a field (''), the backend will now drop that key
    //   from attributes (see updateItem controller).
    const payload = {};
    for (const k of keys) {
      payload[k] = form[k];
    }

    try {
      await axios.put(`/api/items/${item.id}?merge=true`, {
        attributes: payload,
      });
      if (onUpdated) await onUpdated();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert('Failed to save item.');
    }
  };

  const Field = ({ k }) => {
    const label = titleFor(k);

    // boolean -> checkbox
    if (typeof item.attributes?.[k] === 'boolean' || k === 'has_lot') {
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!form[k]}
            onChange={(e) => onChange(k, e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </label>
      );
    }

    // text inputs for everything else (keep it simple & consistent)
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <input
          type="text"
          value={form[k] ?? ''}
          onChange={(e) => onChange(k, e.target.value)}
          placeholder={label}
          className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit Inventory Item</h2>
          <button onClick={onClose} className="text-xl leading-none px-2">
            ×
          </button>
        </div>

        <div className="px-5 py-4">
          {/* 2-column responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keys.map((k) => (
              <Field key={k} k={k} />
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Tip: To clear a value entirely, leave the field empty and click
            Save.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
