import { useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import {
  buildItemPayload,
  createItemForm,
  getCustomAttributeKeys,
} from '../utils/itemContract';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const FormField = ({ label, id, help, children }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
    >
      {label}
    </label>
    {children}
    {help && (
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{help}</p>
    )}
  </div>
);

export default function AddItemModal({
  clientId,
  schema = [],
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(() => createItemForm());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const customAttributeKeys = useMemo(
    () => getCustomAttributeKeys(schema),
    [schema],
  );

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = buildItemPayload({
        form,
        customKeys: customAttributeKeys,
        clientId,
      });

      await api.post('/api/items', payload);
      onCreated?.();
      onClose?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Failed to add item.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyles =
    'w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Add New Inventory Item"
      size="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
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
      }
    >
      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400 mb-4">
          {error}
        </p>
      )}

      <form id="add-item-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Part Number" id="add-part_number">
            <input
              id="add-part_number"
              name="part_number"
              required
              value={form.part_number ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>

          <FormField label="Lot Number" id="add-lot_number">
            <input
              id="add-lot_number"
              name="lot_number"
              value={form.lot_number ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>

          <FormField
            label="Unit of Measure"
            id="add-uom"
            help="Examples: lb, kg, pieces, boxes, bags"
          >
            <input
              id="add-uom"
              name="uom"
              value={form.uom ?? ''}
              onChange={handleChange}
              className={inputStyles}
              maxLength={40}
            />
          </FormField>

          <FormField label="Name" id="add-name">
            <input
              id="add-name"
              name="name"
              value={form.name ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Description" id="add-description">
              <textarea
                id="add-description"
                name="description"
                value={form.description ?? ''}
                onChange={handleChange}
                className={inputStyles}
                rows="2"
              />
            </FormField>
          </div>

          <FormField
            label="Internal Inventory Barcode"
            id="add-barcode"
            help="Unique barcode used to identify one inventory or container record."
          >
            <input
              id="add-barcode"
              name="barcode"
              value={form.barcode ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>

          <FormField
            label="Vendor Barcode"
            id="add-vendor_barcode"
            help="Manufacturer or supplier barcode; it may repeat across containers."
          >
            <input
              id="add-vendor_barcode"
              name="vendor_barcode"
              value={form.vendor_barcode ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>
        </div>

        {customAttributeKeys.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
              Custom Attributes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customAttributeKeys.map((key) => (
                <FormField
                  label={key.replace(/_/g, ' ')}
                  id={`add-${key}`}
                  key={key}
                >
                  <input
                    id={`add-${key}`}
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

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white">
            Alerts
          </h4>

          <div className="flex items-center space-x-2">
            <input
              id="add-alert_enabled"
              type="checkbox"
              name="alert_enabled"
              checked={!!form.alert_enabled}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="add-alert_enabled"
              className="text-sm text-gray-700 dark:text-slate-300"
            >
              Enable Low-Stock Alert
            </label>
          </div>

          {form.alert_enabled && (
            <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Reorder Level" id="add-reorder_level">
                <input
                  id="add-reorder_level"
                  name="reorder_level"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.reorder_level ?? ''}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </FormField>

              <FormField
                label="Low-Stock Threshold"
                id="add-low_stock_threshold"
              >
                <input
                  id="add-low_stock_threshold"
                  name="low_stock_threshold"
                  type="number"
                  min="0"
                  step="0.001"
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
