// frontend/src/components/AddItemModal.jsx (Corrected)
import { useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function AddItemModal({
  clientId,
  schema = [],
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState({ alert_enabled: true });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const CORE_FIELDS = new Set([
    'part_number',
    'lot_number',
    'name',
    'description',
    'barcode',
    'reorder_level',
    'low_stock_threshold',
    'alert_enabled',
  ]);
  const isCustomField = (key) => !CORE_FIELDS.has(key);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { ...form, client_id: parseInt(clientId, 10) };
      await api.post('/api/items', payload);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create item.');
    } finally {
      setSubmitting(false);
    }
  };

  const customSchema = schema.filter(isCustomField);

  return (
    <BaseModal isOpen={true} onClose={onClose} title="Add New Item">
      <form id="add-item-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Core Fields */}
          <div>
            <label
              htmlFor="add-part_number"
              className="mb-1 text-sm font-medium"
            >
              Part Number
            </label>
            <input
              id="add-part_number"
              name="part_number"
              value={form.part_number ?? ''}
              onChange={handleChange}
              className="rounded border px-3 py-2 w-full"
              required
            />
          </div>
          <div>
            <label
              htmlFor="add-lot_number"
              className="mb-1 text-sm font-medium"
            >
              Lot Number
            </label>
            <input
              id="add-lot_number"
              name="lot_number"
              value={form.lot_number ?? ''}
              onChange={handleChange}
              className="rounded border px-3 py-2 w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="add-name" className="mb-1 text-sm font-medium">
              Name
            </label>
            <input
              id="add-name"
              name="name"
              value={form.name ?? ''}
              onChange={handleChange}
              className="rounded border px-3 py-2 w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="add-description"
              className="mb-1 text-sm font-medium"
            >
              Description
            </label>
            <textarea
              id="add-description"
              name="description"
              value={form.description ?? ''}
              onChange={handleChange}
              className="rounded border px-3 py-2 w-full"
              rows="2"
            />
          </div>

          {/* Custom Fields */}
          {customSchema.map((key) => (
            <div key={key}>
              <label
                htmlFor={`add-${key}`}
                className="mb-1 text-sm font-medium"
              >
                {key.replace(/_/g, ' ')}
              </label>
              <input
                id={`add-${key}`}
                name={key}
                value={form[key] ?? ''}
                onChange={handleChange}
                className="rounded border px-3 py-2 w-full"
              />
            </div>
          ))}
        </div>

        <div className="pt-4 mt-4 border-t space-y-4">
          <h4 className="text-base font-semibold text-gray-800">Alerts</h4>
          <div className="flex items-center space-x-2">
            <input
              id="add-alert_enabled"
              type="checkbox"
              name="alert_enabled"
              checked={!!form.alert_enabled}
              onChange={handleChange}
              className="h-4 w-4 rounded"
            />
            <label
              htmlFor="add-alert_enabled"
              className="text-sm text-gray-700"
            >
              Enable Low-Stock Alert
            </label>
          </div>
          {form.alert_enabled && (
            <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="add-reorder_level"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Reorder Level
                </label>
                <input
                  id="add-reorder_level"
                  name="reorder_level"
                  type="number"
                  min="0"
                  value={form.reorder_level ?? ''}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div>
                <label
                  htmlFor="add-low_stock_threshold"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Low-Stock Threshold
                </label>
                <input
                  id="add-low_stock_threshold"
                  name="low_stock_threshold"
                  type="number"
                  min="0"
                  value={form.low_stock_threshold ?? ''}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
            </div>
          )}
        </div>
      </form>
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="add-item-form"
          variant="primary"
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Add Item'}
        </Button>
      </div>
    </BaseModal>
  );
}
