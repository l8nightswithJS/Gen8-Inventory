// frontend/src/components/EditItemModal.jsx (Corrected)
import { useEffect, useState } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import api from '../utils/axiosConfig';

export default function EditItemModal({
  item,
  schema = [],
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState({});
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

  useEffect(() => {
    if (item) {
      setForm({ ...item.attributes, ...item });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const onSave = async () => {
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/api/items/${item.id}`, form);
      onUpdated?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save item.');
    } finally {
      setSubmitting(false);
    }
  };

  const customSchema = schema.filter(isCustomField);

  return (
    <BaseModal isOpen={!!item} onClose={onClose} title="Edit Inventory Item">
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Core Fields */}
        <div>
          <label
            htmlFor="edit-part_number"
            className="mb-1 text-sm font-medium"
          >
            Part Number
          </label>
          <input
            id="edit-part_number"
            name="part_number"
            value={form.part_number ?? ''}
            onChange={handleChange}
            className="rounded border px-3 py-2 w-full"
          />
        </div>
        <div>
          <label htmlFor="edit-lot_number" className="mb-1 text-sm font-medium">
            Lot Number
          </label>
          <input
            id="edit-lot_number"
            name="lot_number"
            value={form.lot_number ?? ''}
            onChange={handleChange}
            className="rounded border px-3 py-2 w-full"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="edit-name" className="mb-1 text-sm font-medium">
            Name
          </label>
          <input
            id="edit-name"
            name="name"
            value={form.name ?? ''}
            onChange={handleChange}
            className="rounded border px-3 py-2 w-full"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="edit-description"
            className="mb-1 text-sm font-medium"
          >
            Description
          </label>
          <textarea
            id="edit-description"
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
            <label htmlFor={`edit-${key}`} className="mb-1 text-sm font-medium">
              {key.replace(/_/g, ' ')}
            </label>
            <input
              id={`edit-${key}`}
              name={key}
              value={form[key] ?? ''}
              onChange={handleChange}
              className="rounded border px-3 py-2 w-full"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t space-y-4">
        <h4 className="text-base font-semibold text-gray-800">Alerts</h4>
        <div className="flex items-center space-x-2">
          <input
            id="edit-alert_enabled"
            type="checkbox"
            name="alert_enabled"
            checked={!!form.alert_enabled}
            onChange={handleChange}
            className="h-4 w-4 rounded"
          />
          <label htmlFor="edit-alert_enabled" className="text-sm text-gray-700">
            Enable Low-Stock Alert
          </label>
        </div>
        {form.alert_enabled && (
          <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-reorder_level"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Reorder Level
              </label>
              <input
                id="edit-reorder_level"
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
                htmlFor="edit-low_stock_threshold"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Low-Stock Threshold
              </label>
              <input
                id="edit-low_stock_threshold"
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

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </BaseModal>
  );
}
