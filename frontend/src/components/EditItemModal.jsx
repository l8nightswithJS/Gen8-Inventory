// src/components/EditItemModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axiosConfig';

// Utility: turn snake_case → Title Case
function humanLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export default function EditItemModal({
  item,
  onClose,
  onUpdated,
  requiredFields = [], // e.g. ['part_number','qty_in_stock']
}) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Derive a stable list of attribute keys
  const attributeKeys = useMemo(
    () => Object.keys(item.attributes || {}),
    [item.attributes],
  );

  // Seed form state whenever item.attributes changes
  useEffect(() => {
    setForm({ ...item.attributes });
    setError('');
  }, [item.attributes]);

  // Handle text/number/checkbox
  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? value === ''
            ? ''
            : Number(value)
          : value,
    }));
  };

  // Validate only numeric fields (and any requiredFields if passed)
  const validate = () => {
    // 1) requiredFields
    for (const key of requiredFields) {
      if (!form[key] && form[key] !== 0) {
        setError(`${humanLabel(key)} is required.`);
        return false;
      }
    }

    // 2) number fields
    for (const key of attributeKeys) {
      const val = form[key];
      if (typeof val === 'number') {
        if (isNaN(val) || val < 0) {
          setError(`${humanLabel(key)} must be a non-negative number.`);
          return false;
        }
      }
    }

    setError('');
    return true;
  };

  // Submit updated attributes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await axios.put(`/api/items/${item.id}`, { attributes: form });
      await onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
          disabled={submitting}
        >
          &times;
        </button>

        <h3 className="text-xl font-semibold text-gray-800">
          Edit Inventory Item
        </h3>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {attributeKeys.map((key) => {
            // infer input type
            const val = form[key];
            const isCheckbox = typeof val === 'boolean';
            const isNumber = typeof val === 'number';

            // hide `lot_number` if tracking disabled
            if (key === 'lot_number' && !form.has_lot) {
              return null;
            }

            if (isCheckbox) {
              return (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    id={key}
                    name={key}
                    type="checkbox"
                    checked={!!val}
                    onChange={handleChange}
                    disabled={submitting}
                    className="h-4 w-4"
                  />
                  <label htmlFor={key} className="text-sm text-gray-700">
                    {humanLabel(key)}
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
                  {humanLabel(key)}
                </label>
                <input
                  id={key}
                  name={key}
                  type={isNumber ? 'number' : 'text'}
                  value={val ?? ''}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            );
          })}

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
