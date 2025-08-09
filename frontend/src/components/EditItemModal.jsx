import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

// Which attribute keys should be treated as numbers
const isNumericField = (key) =>
  ['qty_in_stock', 'reorder_point', 'reorder_qty', 'safety_stock'].includes(
    key,
  );

// Normalize keys to snake_case alnum+underscore only
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

// Strings we never want to send as values
const BAD_STRING_VALUES = new Set(['undefined', 'null', 'nan']);

export default function EditItemModal({ item, onClose, onUpdated }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item?.attributes) {
      setForm({ ...item.attributes });
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

  // Build a cleaned attributes object:
  // - normalize keys
  // - drop empty/undefined/null/"undefined"/"null"/"NaN"
  // - coerce numeric fields to finite numbers
  // - trim strings
  const buildCleanedAttributes = () => {
    const cleaned = {};
    for (const [rawKey, rawVal] of Object.entries(form)) {
      const key = normalizeKey(rawKey);
      if (!key || key === 'undefined' || key === 'null') continue;

      const v = typeof rawVal === 'string' ? rawVal.trim() : rawVal;

      if (v == null || v === '') continue;
      if (typeof v === 'string' && BAD_STRING_VALUES.has(v.toLowerCase()))
        continue;

      if (typeof v === 'boolean') {
        cleaned[key] = v;
        continue;
      }

      if (isNumericField(key)) {
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
      const attributes = buildCleanedAttributes();

      if (!attributes || Object.keys(attributes).length === 0) {
        setError('Nothing to update. Please change a field and try again.');
        setSubmitting(false);
        return;
      }

      // ----- Legacy-compat bridge for old backend validators -----
      // Some routes may still expect top-level `name` and/or `quantity`.
      const legacy = {};
      if (attributes.name == null) {
        const fallbackName =
          item?.attributes?.name ??
          item?.name ?? // in case item still has legacy top-level
          attributes.part_number ??
          'Item';
        legacy.name = String(fallbackName);
      }
      if (
        attributes.qty_in_stock != null &&
        Number.isFinite(attributes.qty_in_stock)
      ) {
        // Mirror to legacy `quantity` if backend still expects it
        legacy.quantity = Number(attributes.qty_in_stock);
      }
      // -----------------------------------------------------------

      const payload = {
        client_id: item?.client_id ?? undefined,
        attributes,
        ...legacy, // include only if set
      };

      console.log('📦 Submitting payload:', payload);
      console.log('📦 Keys:', Object.keys(attributes));

      const res = await axios.put(`/api/items/${item.id}`, payload);

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
    const isNumber = isNumericField(normalized);
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
            disabled={submitting}
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
          disabled={submitting}
          className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
        />
      </div>
    );
  };

  if (!item) return null;

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

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.keys(form).map(renderField)}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
