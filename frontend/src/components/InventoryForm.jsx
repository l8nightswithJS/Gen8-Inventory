// src/components/InventoryForm.jsx
import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function InventoryForm({ clientId, refresh }) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    quantity: '',
    location: '',
    lot_number: '',
    has_lot: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // POST to your Express backend instead of Supabase client
      await axios.post(
        '/api/items',
        {
          client_id: parseInt(clientId, 10),
          name: form.name,
          part_number: form.part_number,
          description: form.description,
          quantity: parseInt(form.quantity, 10) || 0,
          location: form.location,
          has_lot: form.has_lot,
          lot_number: form.has_lot ? form.lot_number : '',
        }
      );

      // Refresh list and clear form
      refresh();
      setForm({
        name: '',
        part_number: '',
        description: '',
        quantity: '',
        location: '',
        lot_number: '',
        has_lot: false,
      });
    } catch (err) {
      console.error(err);
      alert('Error creating item.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-2 bg-gray-50 p-4 rounded border"
    >
      <h3 className="font-semibold">Add Inventory Item</h3>
      <input
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={handleChange}
      />
      <input
        name="part_number"
        placeholder="Part Number"
        value={form.part_number}
        onChange={handleChange}
      />
      <input
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={handleChange}
      />
      <input
        name="quantity"
        placeholder="Quantity"
        value={form.quantity}
        onChange={handleChange}
      />
      <input
        name="location"
        placeholder="Location"
        value={form.location}
        onChange={handleChange}
      />

      <label>
        <input
          type="checkbox"
          name="has_lot"
          checked={form.has_lot}
          onChange={handleChange}
        />{' '}
        Track Lot Number
      </label>
      {form.has_lot && (
        <input
          name="lot_number"
          placeholder="Lot Number"
          value={form.lot_number}
          onChange={handleChange}
        />
      )}
      <button type="submit">Add</button>
    </form>
  );
}
