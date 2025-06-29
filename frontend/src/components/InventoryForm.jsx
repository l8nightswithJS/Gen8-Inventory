import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function InventoryForm({ clientId, refresh }) {
  const [item, setItem] = useState({
    name: '',
    part_number: '',
    description: '',
    quantity: '',
    location: '',
    lot_number: '',
    has_lot: true
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setItem({
      ...item,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...item,
        quantity: parseInt(item.quantity, 10) || 0,
        client_id: clientId,
        has_lot: item.has_lot ? 1 : 0
      };

      if (!item.has_lot) {
        payload.lot_number = ''; // Clear if disabled
      }

      await axios.post('/api/items', payload);
      setSuccess('Item added successfully!');
      setItem({
        name: '',
        part_number: '',
        description: '',
        quantity: '',
        location: '',
        lot_number: '',
        has_lot: true
      });
      if (refresh) refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding item');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8">
      <h3 className="text-lg font-bold mb-4">Add New Item</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          className="border p-2 rounded"
          type="text"
          name="name"
          placeholder="Item Name"
          value={item.name}
          onChange={handleChange}
          required
        />
        <input
          className="border p-2 rounded"
          type="text"
          name="part_number"
          placeholder="Part Number"
          value={item.part_number}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          type="text"
          name="description"
          placeholder="Description"
          value={item.description}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={item.quantity}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          type="text"
          name="location"
          placeholder="Location"
          value={item.location}
          onChange={handleChange}
        />
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="has_lot"
            checked={item.has_lot}
            onChange={handleChange}
          />
          <span>Track Lot Number</span>
        </label>
        {item.has_lot && (
          <input
            className="border p-2 rounded col-span-1 md:col-span-2"
            type="text"
            name="lot_number"
            placeholder="Lot Number"
            value={item.lot_number}
            onChange={handleChange}
          />
        )}
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Add Item
      </button>

      {success && <p className="text-green-600 mt-2">{success}</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </form>
  );
}
