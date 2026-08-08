import { useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import { buildItemPayload, createItemForm } from '../utils/itemContract';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import TypedAttributeFields from './TypedAttributeFields';

const FormField = ({ label, id, help, children }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
      {label}
    </label>
    {children}
    {help && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{help}</p>}
  </div>
);

export default function AddItemModal({ clientId, settings = {}, onClose, onCreated }) {
  const fieldDefinitions = useMemo(
    () => (Array.isArray(settings.field_definitions) ? settings.field_definitions : []),
    [settings],
  );
  const customAttributeKeys = useMemo(
    () => fieldDefinitions.map((definition) => definition.key),
    [fieldDefinitions],
  );
  const [form, setForm] = useState(() => ({
    ...createItemForm(),
    uom: settings.default_uom || '',
  }));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      await onCreated?.();
      onClose?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Failed to add inventory container.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyles =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title="Add Inventory Container"
      size="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="add-item-form" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add Container'}
          </Button>
        </div>
      }
    >
      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300">
        A permanent internal container barcode in the <strong>G8I</strong> namespace will be generated automatically when this record is created.
      </div>

      <form id="add-item-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Part Number" id="add-part_number">
            <input id="add-part_number" name="part_number" required value={form.part_number ?? ''} onChange={handleChange} className={inputStyles} />
          </FormField>
          <FormField label="Lot Number" id="add-lot_number">
            <input id="add-lot_number" name="lot_number" value={form.lot_number ?? ''} onChange={handleChange} className={inputStyles} />
          </FormField>
          <FormField label="Unit of Measure" id="add-uom" help="Examples: lb, kg, pieces, boxes, bags">
            <input id="add-uom" name="uom" value={form.uom ?? ''} onChange={handleChange} className={inputStyles} maxLength={40} />
          </FormField>
          <FormField label="Name" id="add-name">
            <input id="add-name" name="name" value={form.name ?? ''} onChange={handleChange} className={inputStyles} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Description" id="add-description">
              <textarea id="add-description" name="description" value={form.description ?? ''} onChange={handleChange} className={inputStyles} rows="2" />
            </FormField>
          </div>
          <FormField label="Vendor Barcode" id="add-vendor_barcode" help="Optional manufacturer/supplier barcode; it may repeat across containers.">
            <input id="add-vendor_barcode" name="vendor_barcode" value={form.vendor_barcode ?? ''} onChange={handleChange} className={inputStyles} />
          </FormField>
        </div>

        {fieldDefinitions.length > 0 && (
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
              {settings.profile_label || 'Profile'} Fields
            </h4>
            <TypedAttributeFields definitions={fieldDefinitions} form={form} onChange={handleChange} />
          </div>
        )}

        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white">Alerts</h4>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input type="checkbox" name="alert_enabled" checked={!!form.alert_enabled} onChange={handleChange} />
            Enable Low-Stock Alert
          </label>
          {form.alert_enabled && (
            <div className="grid grid-cols-1 gap-4 pl-6 sm:grid-cols-2">
              <FormField label="Reorder Level" id="add-reorder_level">
                <input id="add-reorder_level" name="reorder_level" type="number" min="0" step="0.001" value={form.reorder_level ?? ''} onChange={handleChange} className={inputStyles} />
              </FormField>
              <FormField label="Low-Stock Threshold" id="add-low_stock_threshold">
                <input id="add-low_stock_threshold" name="low_stock_threshold" type="number" min="0" step="0.001" value={form.low_stock_threshold ?? ''} onChange={handleChange} className={inputStyles} />
              </FormField>
            </div>
          )}
        </div>
      </form>
    </BaseModal>
  );
}
