import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'part_number', label: 'Part #', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'quantity', label: 'On Hand', type: 'number' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'has_lot', label: 'Track Lot Number', type: 'checkbox' },
  {
    key: 'lot_number',
    label: 'Lot Number',
    type: 'text',
    dependsOn: 'has_lot',
  },
  { key: 'low_stock_threshold', label: 'Low-Stock Threshold', type: 'number' },
  { key: 'alert_enabled', label: 'Enable Low-Stock Alert', type: 'checkbox' },
];

export default function EditItemModal({ item, onClose, onUpdated }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // seed form with existing values (or defaults)
    const initial = {};
    FIELDS.forEach((f) => {
      if (item?.attributes?.[f.key] != null) {
        initial[f.key] = item.attributes[f.key];
      } else {
        initial[f.key] = f.type === 'checkbox' ? false : '';
      }
    });
    setForm(initial);
  }, [item]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    for (const f of FIELDS) {
      if (f.required) {
        const val = form[f.key];
        if (!val?.toString().trim()) {
          setError(`${f.label} is required.`);
          return false;
        }
      }
      if (f.type === 'number' && form[f.key] !== '') {
        const n = Number(form[f.key]);
        if (isNaN(n) || n < 0) {
          setError(`${f.label} must be a non-negative number.`);
          return false;
        }
      }
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // send entire attributes object
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
          {FIELDS.map(({ key, label, type, dependsOn }) => {
            if (dependsOn && !form[dependsOn]) {
              return null;
            }
            if (type === 'checkbox') {
              return (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    id={key}
                    name={key}
                    type="checkbox"
                    checked={!!form[key]}
                    onChange={handleChange}
                    disabled={submitting}
                    className="h-4 w-4"
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
                  id={key}
                  name={key}
                  type={type}
                  value={form[key] ?? ''}
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
