import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import ColumnSetupModal from './ColumnSetupModal';
import { getSavedSchema, saveSchema } from '../context/SchemaContext';

const normalizeKey = (str) =>
  (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');

const NUMERIC_KEYS = new Set([
  'qty_in_stock',
  'quantity',
  'low_stock_threshold',
  'reorder_point',
  'reorder_qty',
  'safety_stock',
]);

export default function AddItemModal({ clientId, onClose, onCreated }) {
  const [schema, setSchema] = useState([]); // dynamic columns
  const [showSchema, setShowSchema] = useState(false);

  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Seed schema from localStorage on mount
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
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    // If schema has common required keys, validate a couple
    const needs = ['name', 'part_number'];
    for (const k of needs) {
      if (schema.includes(k) && !String(form[k] ?? '').trim()) {
        setError(`${k.replace(/_/g, ' ')} is required.`);
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
    // Always include these controls (even if not in schema)
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
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create item.');
    } finally {
      setSubmitting(false);
    }
  };

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

      {!showSchema && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md relative space-y-4">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              disabled={submitting}
            >
              &times;
            </button>

            <h3 className="text-xl font-semibold text-gray-800">Add Inventory Item</h3>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dynamic fields */}
              {schema.map((key) => (
                <input
                  key={key}
                  name={key}
                  type={NUMERIC_KEYS.has(key) ? 'number' : 'text'}
                  min={NUMERIC_KEYS.has(key) ? '0' : undefined}
                  value={form[key] ?? ''}
                  onChange={handleChange}
                  placeholder={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  className="w-full border px-3 py-2 rounded"
                  disabled={submitting}
                />
              ))}

              {/* Always-present controls */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="has_lot"
                  checked={!!form.has_lot}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <label className="text-sm text-gray-700">Track Lot Number</label>
              </div>

              {form.has_lot && (
                <input
                  name="lot_number"
                  value={form.lot_number ?? ''}
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
                value={form.low_stock_threshold ?? ''}
                onChange={handleChange}
                placeholder="Low Stock Threshold"
                className="w-full border px-3 py-2 rounded"
                disabled={submitting}
              />

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="alert_enabled"
                  checked={!!form.alert_enabled}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <label className="text-sm text-gray-700">Enable Low-Stock Alert</label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                {submitting ? 'Saving...' : 'Add Item'}
              </button>

              <div className="text-xs text-gray-500 text-center">
                Need to change columns?{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setShowSchema(true)}
                >
                  Edit columns
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
