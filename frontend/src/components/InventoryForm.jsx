import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function InventoryForm({
  clientId,
  item = null,      // ← if set, we’re editing
  onSuccess,        // called after create/update
  onClose          // closes the modal
}) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    quantity: '',
    location: '',
    lot_number: '',
    has_lot: false
  });
  const [error, setError] = useState('');

  // preload when editing
  useEffect(() => {
    if (item) {
      setForm({
        name:        item.name || '',
        part_number: item.part_number || '',
        description: item.description || '',
        quantity:    item.quantity != null ? String(item.quantity) : '',
        location:    item.location || '',
        lot_number:  item.lot_number || '',
        has_lot:     !!item.has_lot
      });
    }
  }, [item]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = () => {
    if (!form.name.trim())       return setError('Name is required.');
    if (!form.part_number.trim())return setError('Part # is required.');
    const q = parseInt(form.quantity, 10);
    if (isNaN(q) || q < 0)       return setError('Quantity must be ≥ 0.');
    setError('');
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      client_id:   clientId,
      name:        form.name.trim(),
      part_number: form.part_number.trim(),
      description: form.description,
      quantity:    parseInt(form.quantity, 10),
      location:    form.location,
      has_lot:     form.has_lot,
      lot_number:  form.has_lot ? form.lot_number : ''
    };

    try {
      let res;
      if (item) {
        // UPDATE
        res = await supabase
          .from('items')
          .update(payload)
          .eq('id', item.id);
      } else {
        // INSERT
        res = await supabase
          .from('items')
          .insert([payload]);
      }
      if (res.error) throw res.error;
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Submission failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold">
        {item ? 'Edit Item' : 'Add Inventory Item'}
      </h3>
      {error && <p className="text-red-600">{error}</p>}

      <input
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={handleChange}
        className="w-full border border-gray-300 px-3 py-2 rounded"
      />
      <input
        name="part_number"
        placeholder="Part Number"
        value={form.part_number}
        onChange={handleChange}
        className="w-full border border-gray-300 px-3 py-2 rounded"
      />
      <input
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={handleChange}
        className="w-full border border-gray-300 px-3 py-2 rounded"
      />
      <input
        name="quantity"
        placeholder="Quantity"
        type="number"
        min="0"
        value={form.quantity}
        onChange={handleChange}
        className="w-full border border-gray-300 px-3 py-2 rounded"
      />
      <input
        name="location"
        placeholder="Location"
        value={form.location}
        onChange={handleChange}
        className="w-full border border-gray-300 px-3 py-2 rounded"
      />

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="has_lot"
          checked={form.has_lot}
          onChange={handleChange}
          className="rounded"
        />
        <span>Track Lot Number</span>
      </label>

      {form.has_lot && (
        <input
          name="lot_number"
          placeholder="Lot Number"
          value={form.lot_number}
          onChange={handleChange}
          className="w-full border border-gray-300 px-3 py-2 rounded"
        />
      )}

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {item ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}
