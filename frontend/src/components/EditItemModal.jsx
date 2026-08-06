import { useEffect, useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import { buildItemPayload, createItemForm } from '../utils/itemContract';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import TypedAttributeFields from './TypedAttributeFields';

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

export default function EditItemModal({
  item,
  settings = {},
  onClose,
  onUpdated,
}) {
  const fieldDefinitions = useMemo(
    () => (Array.isArray(settings.field_definitions) ? settings.field_definitions : []),
    [settings],
  );
  const customAttributeKeys = useMemo(
    () => fieldDefinitions.map((definition) => definition.key),
    [fieldDefinitions],
  );
  const [form, setForm] = useState(() => createItemForm(item));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(createItemForm(item));
    setError('');
  }, [item]);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!item) return;

    setError('');
    setSubmitting(true);

    try {
      const payload = buildItemPayload({
        form,
        customKeys: customAttributeKeys,
      });

      await api.put(`/api/items/${item.id}`, payload);
      await onUpdated?.();
      onClose?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Failed to update item.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyles =
    'w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  const reviewIssues = Array.isArray(item?.review_issues)
    ? item.review_issues
    : [];

  return (
    <BaseModal
      isOpen={!!item}
      onClose={onClose}
      title={`Edit: ${item?.name ?? item?.description ?? item?.part_number ?? 'Item'}`}
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
            disabled={submitting || !item}
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

      {item?.review_status === 'needs_review' && reviewIssues.length > 0 && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-semibold">Inventory data needs review</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {reviewIssues.map((issue, index) => (
              <li key={`${issue.type || 'issue'}-${index}`}>
                {issue.message || 'Imported data requires review.'}
                {issue.source_value ? ` Source: ${issue.source_value}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Use the Resolve action from the inventory list to assign official
            location quantities.
          </p>
        </div>
      )}

      <form id="edit-item-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Part Number" id="edit-part_number">
            <input
              id="edit-part_number"
              name="part_number"
              required
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

          <FormField
            label="Unit of Measure"
            id="edit-uom"
            help="Examples: lb, kg, pieces, boxes, bags"
          >
            <input
              id="edit-uom"
              name="uom"
              value={form.uom ?? ''}
              onChange={handleChange}
              className={inputStyles}
              maxLength={40}
            />
          </FormField>

          <FormField label="Name" id="edit-name">
            <input
              id="edit-name"
              name="name"
              value={form.name ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>

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

          <FormField
            label="Internal Inventory Barcode"
            id="edit-barcode"
            help="Unique barcode used to identify this inventory or container record."
          >
            <input
              id="edit-barcode"
              name="barcode"
              value={form.barcode ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>

          <FormField
            label="Vendor Barcode"
            id="edit-vendor_barcode"
            help="Manufacturer or supplier barcode; it may repeat across containers."
          >
            <input
              id="edit-vendor_barcode"
              name="vendor_barcode"
              value={form.vendor_barcode ?? ''}
              onChange={handleChange}
              className={inputStyles}
            />
          </FormField>
        </div>

        {fieldDefinitions.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
              {settings.profile_label || 'Profile'} Fields
            </h4>
            <TypedAttributeFields
              definitions={fieldDefinitions}
              form={form}
              onChange={handleChange}
            />
          </div>
        )}

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
                  step="0.001"
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
