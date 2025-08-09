import React, { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axiosConfig';
import { getSavedSchema } from '../context/SchemaContext';

const NUMERIC_KEYS = new Set([
  'qty_in_stock',
  'reorder_point',
  'reorder_qty',
  'safety_stock',
  'low_stock_threshold',
  'quantity',
]);

const normalizeKey = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
};

const humanLabel = (key) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const BAD_STRING_VALUES = new Set(['undefined', 'null', 'nan']);

export default function EditItemModal({ item, onClose, onUpdated }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // derive values used by hooks
  const clientId = item?.client_id;
  const hasItem = !!item;

  // Always call hooks unconditionally
  const clientSchema = useMemo(
    () => (clientId ? getSavedSchema(clientId) : []),
    [clientId],
  );

  useEffect(() => {
    if (item?.attributes && typeof item.attributes === 'object') {
      const base = { ...item.attributes };
      if (!('has_lot' in base)) base.has_lot = !!base.lot_number;
      if (!('alert_enabled' in base)) base.alert_enabled = true;
      if (!('low_stock_threshold' in base)) base.low_stock_threshold = '';
      setForm(base);
    } else {
      setForm({});
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
        ...clientSchema, // keep schema ordering/visibility
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

      const payload = { attributes };
      const res = await axios.put(`/api/items/${item.id}?merge=true`, payload);

      if (typeof onUpdated === 'function') await onUpdated(res.data);
      if (typeof onClose === 'function') onClose();
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
        />
      </div>
    );
  };

  // Always compute, even if item is missing (keeps hooks order stable)
  const allKeys = useMemo(() => {
    const fromAttrs = Object.keys(form || {});
    const ordered = [
      ...clientSchema.filter((k) => fromAttrs.includes(k)),
      ...fromAttrs.filter((k) => !clientSchema.includes(k)),
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
  }, [form, clientSchema]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md relative space-y-4">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
          aria-label="Close edit modal"
        >
          &times;
        </button>

        <h3 className="text-xl font-semibold text-gray-800">
          Edit Inventory Item
        </h3>

        {!hasItem && (
          <p className="text-sm text-gray-600">
            No item selected. Close this dialog and pick an item to edit.
          </p>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {allKeys.map(renderField)}

          <button
            type="submit"
            disabled={submitting || !hasItem}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
