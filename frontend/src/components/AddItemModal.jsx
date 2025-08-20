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

export default function AddItemModal({ clientId, onClose, onCreated }) {
  const [schema, setSchema] = useState([]);
  const [showSchema, setShowSchema] = useState(false);
  const [form, setForm] = useState({ alert_enabled: true }); // Default alert to true
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = getSavedSchema(clientId);
    if (!s.length) {
      setShowSchema(true);
    }
    setSchema(s);
  }, [clientId]);

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

  const validate = () => {
    const needs = ['name', 'part_number'];
    for (const k of needs) {
      if (schema.includes(k) && !String(form[k] ?? '').trim()) {
        setError(`'${k.replace(/_/g, ' ')}' is a required field.`);
        return false;
      }
    }
    return true;
  };

  const buildAttributes = () => {
    const attrs = {};
    for (const key of schema) {
      const raw = form[key];
      if (raw == null || raw === '') continue;
      if (NUMERIC_KEYS.has(key)) {
        const n = Number(raw);
        if (Number.isFinite(n)) attrs[key] = n;
      } else {
        attrs[key] = typeof raw === 'string' ? raw.trim() : raw;
      }
    }

    if (!schema.includes('barcode') && form.barcode) {
      const code = String(form.barcode).trim();
      if (code) attrs.barcode = code;
    }

    if ('has_lot' in form) attrs.has_lot = !!form.has_lot;
    if (attrs.has_lot) {
      const lot = String(form.lot_number || '').trim();
      if (lot) attrs.lot_number = lot;
    }
    if ('low_stock_threshold' in form) {
      const n = Number(form.low_stock_threshold);
      if (Number.isFinite(n)) attrs.low_stock_threshold = n;
    }
    if ('alert_enabled' in form) attrs.alert_enabled = !!form.alert_enabled;

    return attrs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    const attributes = buildAttributes();

    try {
      setSubmitting(true);
      const { data } = await axios.post('/api/items', {
        client_id: parseInt(clientId, 10),
        attributes,
      });
      onCreated?.(data);
      onClose(); // Close on success
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

          {schema.map((key) => (
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
            <div className="flex items-center space-x-2">
              <input
                id="fld-has_lot"
                type="checkbox"
                name="has_lot"
                checked={!!form.has_lot}
                onChange={handleChange}
                disabled={submitting}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="fld-has_lot" className="text-sm text-gray-700">
                Track Lot Number
              </label>
            </div>

            {form.has_lot && (
              <div>
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

            <div>
              <label
                htmlFor="fld-low_stock_threshold"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Low Stock Threshold
              </label>
              <input
                id="fld-low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                min="0"
                value={form.low_stock_threshold ?? ''}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded border-gray-300"
                disabled={submitting}
              />
            </div>

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
          </div>

          <div className="text-xs text-gray-500 text-center">
            Need to change columns?{' '}
            <button
              type="button"
              className="underline"
              onClick={() => setShowSchema(true)}
              disabled={submitting}
            >
              Edit columns
            </button>
          </div>
        </form>
      </BaseModal>
    </>
  );
}
