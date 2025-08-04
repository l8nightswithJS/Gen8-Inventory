import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function AddItemModal({ clientId, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    quantity: '',
    location: '',
    has_lot: false,
    lot_number: '',
    low_stock_threshold: '',
    alert_enabled: false,
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    if (!form.name.trim() || !form.part_number.trim()) {
      setError('Name and Part # are required.');
      return false;
    }
    if (isNaN(parseInt(form.quantity, 10)) || parseInt(form.quantity, 10) < 0) {
      setError('Quantity must be a non-negative number.');
      return false;
    }
    if (
      form.low_stock_threshold &&
      (isNaN(parseInt(form.low_stock_threshold, 10)) ||
        parseInt(form.low_stock_threshold, 10) < 0)
    ) {
      setError('Threshold must be a non-negative number.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    const attributes = {
      name: form.name.trim(),
      part_number: form.part_number.trim(),
      description: form.description.trim(),
      quantity: parseInt(form.quantity, 10),
      location: form.location.trim(),
      has_lot: form.has_lot,
      lot_number: form.has_lot ? form.lot_number.trim() : '',
      low_stock_threshold: form.low_stock_threshold
        ? parseInt(form.low_stock_threshold, 10)
        : 0,
      alert_enabled: form.alert_enabled,
    };

    try {
      setSubmitting(true);
      const { data } = await axios.post('/api/items', {
        client_id: parseInt(clientId, 10),
        attributes,
      });
      onCreated?.(data);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create item.');
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
          Add Inventory Item
        </h3>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Name"
            required
            className="w-full border px-3 py-2 rounded"
            disabled={submitting}
          />
          <input
            name="part_number"
            value={form.part_number}
            onChange={handleChange}
            placeholder="Part Number"
            required
            className="w-full border px-3 py-2 rounded"
            disabled={submitting}
          />
          <input
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
            className="w-full border px-3 py-2 rounded"
            disabled={submitting}
          />
          <input
            name="quantity"
            type="number"
            min="0"
            value={form.quantity}
            onChange={handleChange}
            placeholder="Quantity"
            className="w-full border px-3 py-2 rounded"
            disabled={submitting}
          />
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Location"
            className="w-full border px-3 py-2 rounded"
            disabled={submitting}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="has_lot"
              checked={form.has_lot}
              onChange={handleChange}
              disabled={submitting}
            />
            <label className="text-sm text-gray-700">Track Lot Number</label>
          </div>
          {form.has_lot && (
            <input
              name="lot_number"
              value={form.lot_number}
              onChange={handleChange}
              placeholder="Lot Number"
              className="w-full border px-3 py-2 rounded"
              disabled={submitting}
            />
          )}
          <input
            name="low_stock_threshold"
            type="number"
            min="0"
            value={form.low_stock_threshold}
            onChange={handleChange}
            placeholder="Low Stock Threshold"
            className="w-full border px-3 py-2 rounded"
            disabled={submitting}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="alert_enabled"
              checked={form.alert_enabled}
              onChange={handleChange}
              disabled={submitting}
            />
            <label className="text-sm text-gray-700">
              Enable Low-Stock Alert
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {submitting ? 'Saving...' : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
