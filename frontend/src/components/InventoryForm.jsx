import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function InventoryForm({ refresh, clientId }) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    lot_number: '',
    quantity: '',
    location: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.part_number.trim()) {
      setError('Name and Part Number are required.');
      return;
    }
    try {
      await axios.post('http://localhost:8000/api/items', { ...form, client_id: clientId });
      setForm({
        name: '',
        part_number: '',
        description: '',
        lot_number: '',
        quantity: '',
        location: ''
      });
      setError('');
      refresh();
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred. Try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <h3>Add Item</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
      <input name="part_number" value={form.part_number} onChange={handleChange} placeholder="Part Number" required />
      <input name="description" value={form.description} onChange={handleChange} placeholder="Description" />
      <input name="lot_number" value={form.lot_number} onChange={handleChange} placeholder="Lot Number" />
      <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" />
      <input name="location" value={form.location} onChange={handleChange} placeholder="Location" />
      <button type="submit">Add Item</button>
    </form>
  );
}
