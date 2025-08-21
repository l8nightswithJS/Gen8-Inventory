// src/components/AddItemModal.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import ColumnSetupModal from './ColumnSetupModal';
import { getSavedSchema, saveSchema } from '../context/SchemaContext';

const NUMERIC_KEYS = new Set([
  'qty_in_stock',
  'quantity',
  'low_stock_threshold',
  'reorder_level',
  'reorder_qty',
]);

// Keys handled in the dedicated alert section
const ALERT_SYSTEM_KEYS = new Set([
  'alert_enabled',
  'low_stock_threshold',
  'reorder_level',
  'reorder_qty',
]);

export default function AddItemModal({
  clientId,
  onClose,
  onCreated,
  isLotTrackingLocked,
}) {
  const [schema, setSchema] = useState([]);
  const [showSchema, setShowSchema] = useState(false);
  const [form, setForm] = useState({ alert_enabled: true });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = getSavedSchema(clientId);
    if (!s.length) {
      setShowSchema(true);
    }
    setSchema(s);
    if (isLotTrackingLocked) {
      setForm((f) => ({ ...f, has_lot: true }));
    }
  }, [clientId, isLotTrackingLocked]);

  const handleSchemaSave = (cols) => {
    const saved = saveSchema(clientId, cols);
    setSchema(saved);
    setShowSchema(false);
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buildAttributes = () => {
    const attrs = {};
    // Add dynamically rendered fields from schema
    schema.forEach((key) => {
      if (ALERT_SYSTEM_KEYS.has(key)) return; // Skip alert keys, handled below
      const raw = form[key];
      if (raw == null || raw === '') return;
      attrs[key] = typeof raw === 'string' ? raw.trim() : raw;
    });

    // Add special and alert-related fields
    if (!schema.includes('barcode') && form.barcode) {
      attrs.barcode = String(form.barcode).trim() || undefined;
    }
    if (form.has_lot) {
      attrs.has_lot = true;
      attrs.lot_number = String(form.lot_number || '').trim() || undefined;
    }
    attrs.alert_enabled = !!form.alert_enabled;
    if (attrs.alert_enabled) {
      attrs.low_stock_threshold = Number(form.low_stock_threshold) || undefined;
      attrs.reorder_level = Number(form.reorder_level) || undefined;
      attrs.reorder_qty = Number(form.reorder_qty) || undefined;
    }

    return attrs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const attributes = buildAttributes();

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

  const Footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="add-item-form"
        variant="primary"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? 'Saving...' : 'Add Item'}
      </Button>
    </>
  );

  const humanize = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      {showSchema && (
        <ColumnSetupModal
          isOpen={showSchema}
          onClose={() => setShowSchema(false)}
          onSave={handleSchemaSave}
          initial={schema}
        />
      )}

      <BaseModal
        isOpen={!showSchema}
        onClose={onClose}
        title="Add New Item"
        footer={Footer}
      >
        <form id="add-item-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {schema
            .filter((key) => !ALERT_SYSTEM_KEYS.has(key))
            .map((key) => (
              <div key={key}>
                <label
                  htmlFor={`fld-${key}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {humanize(key)}
                </label>
                <input
                  id={`fld-${key}`}
                  name={key}
                  type={NUMERIC_KEYS.has(key) ? 'number' : 'text'}
                  min={NUMERIC_KEYS.has(key) ? '0' : undefined}
                  value={form[key] ?? ''}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded border-gray-300"
                  disabled={submitting}
                />
              </div>
            ))}

          {!schema.includes('barcode') && (
            <div>
              <label
                htmlFor="fld-barcode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Barcode
              </label>
              <input
                id="fld-barcode"
                name="barcode"
                value={form.barcode ?? ''}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded border-gray-300"
                disabled={submitting}
              />
            </div>
          )}

          <div className="pt-2 border-t space-y-4">
            <h4 className="text-base font-semibold text-gray-800">
              Tracking & Alerts
            </h4>
            {/* Lot Number Section */}
            <div className="flex items-center space-x-2">
              <input
                id="fld-has_lot"
                type="checkbox"
                name="has_lot"
                checked={!!form.has_lot}
                onChange={handleChange}
                disabled={submitting || isLotTrackingLocked}
                className="h-4 w-4 rounded disabled:opacity-70"
              />
              <label
                htmlFor="fld-has_lot"
                className={`text-sm text-gray-700 ${
                  isLotTrackingLocked ? 'opacity-70' : ''
                }`}
              >
                Track Lot Number
              </label>
            </div>
            {form.has_lot && (
              <div className="pl-6">
                <label
                  htmlFor="fld-lot_number"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Lot Number
                </label>
                <input
                  id="fld-lot_number"
                  name="lot_number"
                  value={form.lot_number ?? ''}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded border-gray-300"
                  disabled={submitting}
                />
              </div>
            )}
            {/* Low Stock Alert Section */}
            <div className="flex items-center space-x-2">
              <input
                id="fld-alert_enabled"
                type="checkbox"
                name="alert_enabled"
                checked={!!form.alert_enabled}
                onChange={handleChange}
                disabled={submitting}
                className="h-4 w-4 rounded"
              />
              <label
                htmlFor="fld-alert_enabled"
                className="text-sm text-gray-700"
              >
                Enable Low-Stock Alert
              </label>
            </div>
            {form.alert_enabled && (
              <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="fld-reorder_level"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Reorder Level
                  </label>
                  <input
                    id="fld-reorder_level"
                    name="reorder_level"
                    type="number"
                    min="0"
                    value={form.reorder_level ?? ''}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded border-gray-300"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label
                    htmlFor="fld-reorder_qty"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Reorder Quantity
                  </label>
                  <input
                    id="fld-reorder_qty"
                    name="reorder_qty"
                    type="number"
                    min="0"
                    value={form.reorder_qty ?? ''}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded border-gray-300"
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </BaseModal>
    </>
  );
}
