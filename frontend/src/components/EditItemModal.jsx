// src/components/EditItemModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axiosConfig';

// ────── Constants ────── //

const NUMERIC_KEYS = new Set([
  'qty_in_stock',
  'quantity',
  'low_stock_threshold',
  'on_hand',
]);

// ────── Helpers ────── //

const normalizeKey = (str) =>
  str
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_') || '';

const humanLabel = (key) =>
  normalizeKey(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ────── Component ────── //

export default function EditItemModal({ item, onClose, onUpdated }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const attributeKeys = useMemo(
    () => Object.keys(item.attributes || {}),
    [item.attributes],
  );

  useEffect(() => {
    setForm(item.attributes || {});
    setError('');
  }, [item.attributes]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    for (const key of attributeKeys) {
      const normKey = normalizeKey(key);
      if (!NUMERIC_KEYS.has(normKey)) continue;

      const val = form[key];
      if (val == null || val === '') continue;

      const n = Number(val);
      if (isNaN(n) || n < 0) {
        setError(`${humanLabel(key)} must be a non-negative number.`);
        return false;
      }
    }
    setError('');
    return true;
  };

  const buildCleanedAttributes = () => {
    const cleaned = {};
    for (const [rawKey, rawVal] of Object.entries(form)) {
      if (rawVal == null || rawVal === '') continue;

      const key = normalizeKey(rawKey);
      if (!key || key === 'undefined') continue;

      if (NUMERIC_KEYS.has(key)) {
        cleaned[key] = Number(rawVal);
      } else if (typeof rawVal === 'boolean') {
        cleaned[key] = rawVal;
      } else {
        cleaned[key] = String(rawVal).trim();
      }
    }
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const cleaned = buildCleanedAttributes();
    setSubmitting(true);

    try {
      await axios.put(`/api/items/${item.id}`, { attributes: cleaned });
      await onUpdated();
      onClose();
    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.message || 'Failed to update item.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (rawKey) => {
    const key = normalizeKey(rawKey);
    const val = form[rawKey];
    const isBool = typeof val === 'boolean';
    const isNumber = NUMERIC_KEYS.has(key);

    if (isBool) {
      return (
        <div key={rawKey} className="flex items-center space-x-2">
          <input
            id={rawKey}
            name={rawKey}
            type="checkbox"
            checked={!!val}
            onChange={handleChange}
            disabled={submitting}
            className="h-4 w-4"
          />
          <label htmlFor={rawKey} className="text-sm text-gray-700">
            {humanLabel(rawKey)}
          </label>
        </div>
      );
    }

    return (
      <div key={rawKey}>
        <label
          htmlFor={rawKey}
          className="block text-sm font-medium text-gray-700"
        >
          {humanLabel(rawKey)}
        </label>
        <input
          id={rawKey}
          name={rawKey}
          type={isNumber ? 'number' : 'text'}
          value={val ?? ''}
          onChange={handleChange}
          disabled={submitting}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md relative space-y-4">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
        >
          &times;
        </button>

        <h3 className="text-xl font-semibold text-gray-800">
          Edit Inventory Item
        </h3>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {attributeKeys.map(renderField)}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded disabled:opacity-50"
          >
            {submitting ? 'Updating…' : 'Update Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
