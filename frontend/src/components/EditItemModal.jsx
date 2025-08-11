// src/components/EditItemModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axiosConfig';
import { getSavedSchema } from '../context/SchemaContext';

const QUANTITY_ALIASES = [
  'qty_in_stock',
  'qty_on_hand',
  'quantity',
  'on_hand',
  'stock',
  'qty',
];

const NUMERIC_KEYS = new Set([
  'qty_in_stock',
  'qty_on_hand',
  'quantity',
  'reorder_point',
  'reorder_qty',
  'safety_stock',
  'low_stock_threshold',
]);

const CUSTOM_LABELS = {
  qty_in_stock: 'Qty On Hand',
  qty_on_hand: 'Qty On Hand',
  quantity: 'Qty On Hand',
};

const BAD_STRING_VALUES = new Set(['undefined', 'null', 'nan']);

const normalizeKey = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
};

const humanLabel = (key) => {
  if (CUSTOM_LABELS[key]) return CUSTOM_LABELS[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function EditItemModal({ item, onClose, onUpdated }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lock background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = prev);
  }, []);

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const clientId = item?.client_id;
  const hasItem = !!item;

  const clientSchema = useMemo(
    () => (clientId ? getSavedSchema(clientId) : []),
    [clientId],
  );

  // Determine which key we should use for "Qty On Hand"
  const quantityKey = useMemo(() => {
    const fromSchema = QUANTITY_ALIASES.find((k) => clientSchema.includes(k));
    const fromForm = QUANTITY_ALIASES.find((k) => k in (form || {}));
    return fromForm || fromSchema || 'quantity';
  }, [clientSchema, form]);

  useEffect(() => {
    if (item?.attributes && typeof item.attributes === 'object') {
      const base = { ...item.attributes };

      // Ensure standard toggles exist
      if (!('has_lot' in base)) base.has_lot = !!base.lot_number;
      if (!('alert_enabled' in base)) base.alert_enabled = true;
      if (!('low_stock_threshold' in base)) base.low_stock_threshold = '';

      // Ensure a qty field is present even if it didn't exist before
      const hasAnyQty = QUANTITY_ALIASES.some((k) => k in base);
      if (!hasAnyQty) base.quantity = ''; // default key if none existed

      setForm(base);
    } else {
      // Fresh form: seed qty so the input shows up
      setForm({ quantity: '', has_lot: false, alert_enabled: true });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buildCleanedAttributes = () => {
    const cleaned = {};
    const keys = Array.from(
      new Set([
        ...Object.keys(form),
        ...clientSchema, // preserve ordering/visibility
        quantityKey, // ensure our qty key is included
        'has_lot',
        'lot_number',
        'low_stock_threshold',
        'alert_enabled',
      ]),
    );

    for (const rawKey of keys) {
      const key = normalizeKey(rawKey);
      if (!key || key === 'undefined' || key === 'null') continue;

      const rawVal = form[rawKey];
      const v = typeof rawVal === 'string' ? rawVal.trim() : rawVal;

      if (v == null || v === '') continue;
      if (typeof v === 'string' && BAD_STRING_VALUES.has(v.toLowerCase()))
        continue;

      if (typeof v === 'boolean') {
        cleaned[key] = v;
        continue;
      }

      if (NUMERIC_KEYS.has(key)) {
        const n = Number(v);
        if (Number.isFinite(n)) cleaned[key] = n;
        continue;
      }

      cleaned[key] = String(v);
    }

    delete cleaned.undefined;
    delete cleaned.null;
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!hasItem || !item.id) {
        setError('No item selected to update.');
        setSubmitting(false);
        return;
      }

      const attributes = buildCleanedAttributes();
      if (!attributes || Object.keys(attributes).length === 0) {
        setError('Nothing to update. Please change a field and try again.');
        setSubmitting(false);
        return;
      }

      const res = await axios.put(`/api/items/${item.id}?merge=true`, {
        attributes,
      });

      await onUpdated?.(res.data);
      onClose?.();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('❌ PUT failed', { status, data, err });

      let msg =
        (data && (data.message || data.error)) ||
        (typeof data === 'string' && data) ||
        err.message ||
        'Failed to update item.';

      if (typeof msg === 'string' && msg.startsWith('<!DOCTYPE html')) {
        msg =
          'Update failed (server returned HTML error page). Check server logs.';
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (key) => {
    const val = form[key];
    const label = humanLabel(key);
    const normalized = normalizeKey(key);
    const isNumber = NUMERIC_KEYS.has(normalized);
    const isBoolean = typeof val === 'boolean';

    if (isBoolean) {
      return (
        <div key={key} className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={key}
            name={key}
            checked={!!val}
            onChange={handleChange}
            className="h-4 w-4"
            disabled={submitting || !hasItem}
          />
          <label htmlFor={key} className="text-sm text-gray-700">
            {label}
          </label>
        </div>
      );
    }

    return (
      <div key={key}>
        <label
          htmlFor={key}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <input
          type={isNumber ? 'number' : 'text'}
          id={key}
          name={key}
          value={val ?? ''}
          onChange={handleChange}
          disabled={submitting || !hasItem}
          className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
          step={isNumber ? '1' : undefined}
          min={isNumber ? '0' : undefined}
        />
      </div>
    );
  };

  const allKeys = useMemo(() => {
    const fromAttrs = Object.keys(form || {});
    // Put quantity first if present
    const ordered = [
      ...[quantityKey].filter(
        (k) => fromAttrs.includes(k) || k === quantityKey,
      ),
      ...clientSchema.filter((k) => fromAttrs.includes(k) && k !== quantityKey),
      ...fromAttrs.filter(
        (k) => !clientSchema.includes(k) && k !== quantityKey,
      ),
    ];

    for (const k of [
      'has_lot',
      'lot_number',
      'low_stock_threshold',
      'alert_enabled',
    ]) {
      if (!ordered.includes(k)) ordered.push(k);
    }
    return ordered;
  }, [form, clientSchema, quantityKey]);

  // ===== Modal UI (scroll-safe) =====
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="min-h-full w-full flex items-start md:items-center justify-center p-4">
        <div
          className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 md:p-6 border-b bg-white rounded-t-2xl">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800">
              Edit Inventory Item
            </h3>
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              aria-label="Close edit modal"
            >
              &times;
            </button>
          </div>

          {/* Body (scrollable) */}
          <div className="p-4 md:p-6 max-h-[75vh] overflow-y-auto space-y-4">
            {!hasItem && (
              <p className="text-sm text-gray-600">
                No item selected. Close this dialog and pick an item to edit.
              </p>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {allKeys.map(renderField)}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !hasItem}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
