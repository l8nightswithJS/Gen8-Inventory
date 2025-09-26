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
  schema = [], // schema is passed but not used, can be removed if not needed elsewhere
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ✅ FIX: Expanded CORE_FIELDS to include all non-custom, top-level properties from the API item object.
  const CORE_FIELDS = new Set([
    'id',
    'client_id',
    'part_number',
    'lot_number',
    'name',
    'description',
    'barcode',
    'reorder_level',
    'low_stock_threshold',
    'alert_enabled',
    'alert_acknowledged_at',
    'created_at',
    'last_updated',
    'attributes', // The attributes object itself is a core field
    'total_quantity', // Read-only data from the API
    'status', // Read-only data from the API
  ]);

  useEffect(() => {
    if (item) {
      // Initialize form state by combining the top-level item and its attributes.
      // This ensures all fields are populated correctly.
      setForm({ ...item, ...(item.attributes || {}) });
    }
  }, [item]);

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
      const payload = { ...form };

      // Ensure numeric fields are sent as numbers
      if (payload.reorder_level != null && payload.reorder_level !== '') {
        payload.reorder_level = parseFloat(payload.reorder_level);
      }
      if (
        payload.low_stock_threshold != null &&
        payload.low_stock_threshold !== ''
      ) {
        payload.low_stock_threshold = parseFloat(payload.low_stock_threshold);
      }

      await api.put(`/api/items/${item.id}`, payload);
      onUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update item.');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ FIX: Calculate which keys are true custom fields by filtering out the core fields.
  const customAttributeKeys = item
    ? Object.keys(item.attributes || {}).filter((key) => !CORE_FIELDS.has(key))
    : [];

  const inputStyles =
    'w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <BaseModal
      isOpen={!!item}
      onClose={onClose}
      title={`Edit: ${item?.name ?? 'Item'}`}
      size="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-item-form"
            variant="primary"
            disabled={submitting}
          >
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
      <form id="edit-item-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Core Fields Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        {/* Custom Attributes Section - Only renders if there are custom fields */}
        {customAttributeKeys.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
              Custom Attributes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customAttributeKeys.map((key) => (
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
          </div>
        )}

        {/* Alerts Section */}
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
      </form>
    </BaseModal>
  );
}
