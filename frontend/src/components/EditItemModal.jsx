import { useEffect, useState } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import api from '../utils/axiosConfig';

// Helper component for form fields to reduce repetition
const FormField = ({ label, id, children }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
    >
      {label}
    </label>
    {children}
  </div>
);

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

  // Common input styles
  const inputStyles =
    'w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <BaseModal
      isOpen={!!item}
      onClose={onClose}
      title="Edit Inventory Item"
      size="max-w-2xl" // Slightly larger for better layout
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400 mb-4">
          {error}
        </p>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Core Fields */}
          <FormField label="Part Number" id="edit-part_number">
            <input
              id="edit-part_number"
              name="part_number"
              value={form.part_number ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>
          <FormField label="Lot Number" id="edit-lot_number">
            <input
              id="edit-lot_number"
              name="lot_number"
              value={form.lot_number ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Name" id="edit-name">
              <input
                id="edit-name"
                name="name"
                value={form.name ?? ''}
                onChange={handleChange}
                className={inputStyles}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Description" id="edit-description">
              <textarea
                id="edit-description"
                name="description"
                value={form.description ?? ''}
                onChange={handleChange}
                className={inputStyles}
                rows="2"
              />
            </FormField>
          </div>

          {/* Custom Fields */}
          {customSchema.map((key) => (
            <FormField
              label={key.replace(/_/g, ' ')}
              id={`edit-${key}`}
              key={key}
            >
              <input
                id={`edit-${key}`}
                name={key}
                value={form[key] ?? ''}
                onChange={handleChange}
                className={inputStyles}
              />
            </FormField>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white">
            Alerts
          </h4>
          <div className="flex items-center space-x-2">
            <input
              id="edit-alert_enabled"
              type="checkbox"
              name="alert_enabled"
              checked={!!form.alert_enabled}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="edit-alert_enabled"
              className="text-sm text-gray-700 dark:text-slate-300"
            >
              Enable Low-Stock Alert
            </label>
          </div>
          {form.alert_enabled && (
            <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Reorder Level" id="edit-reorder_level">
                <input
                  id="edit-reorder_level"
                  name="reorder_level"
                  type="number"
                  min="0"
                  value={form.reorder_level ?? ''}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </FormField>
              <FormField
                label="Low-Stock Threshold"
                id="edit-low_stock_threshold"
              >
                <input
                  id="edit-low_stock_threshold"
                  name="low_stock_threshold"
                  type="number"
                  min="0"
                  value={form.low_stock_threshold ?? ''}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </FormField>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
