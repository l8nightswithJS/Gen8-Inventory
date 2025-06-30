import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

export default function InventoryForm({ clientId, item = null, refresh }) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    quantity: 0,
    location: '',
    lot_number: '',
    has_lot: 1,
    attributes: {},
  });

  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (item) {
      setForm({
        ...item,
        attributes: item.attributes || {},
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setForm((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(val, 10) || 0 : val,
    }));
  };

  const handleAttrChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value,
      },
    }));
  };

  const handleAttrAdd = () => {
    if (!newAttrKey.trim()) return;
    setForm((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [newAttrKey.trim()]: newAttrValue.trim(),
      },
    }));
    setNewAttrKey('');
    setNewAttrValue('');
  };

  const handleAttrRemove = (key) => {
    const updated = { ...form.attributes };
    delete updated[key];
    setForm((prev) => ({ ...prev, attributes: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, client_id: clientId };
      if (item) {
        await axios.put(`/api/items/${item.id}`, payload);
        setMessage('Item updated.');
      } else {
        await axios.post('/api/items', payload);
        setMessage('Item added.');
        setForm({
          name: '',
          part_number: '',
          description: '',
          quantity: 0,
          location: '',
          lot_number: '',
          has_lot: 1,
          attributes: {},
        });
      }
      if (refresh) refresh();
    } catch (err) {
      console.error(err);
      setMessage('Error saving item.');
    }
  };

  return (
    <div className="my-6">
      <h3 className="text-lg font-semibold mb-2">{item ? 'Edit Item' : 'Add Item'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2 rounded" required />
          <input type="text" name="part_number" value={form.part_number} onChange={handleChange} placeholder="Part Number" className="border p-2 rounded" />
          <input type="text" name="description" value={form.description} onChange={handleChange} placeholder="Description" className="border p-2 rounded" />
          <input type="number" name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" className="border p-2 rounded" />
          <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="Location" className="border p-2 rounded" />
          <input type="text" name="lot_number" value={form.lot_number} onChange={handleChange} placeholder="Lot Number" className="border p-2 rounded" />
        </div>

        <label className="block">
          <input type="checkbox" name="has_lot" checked={form.has_lot} onChange={handleChange} className="mr-2" />
          Requires Lot Number
        </label>

        {/* Dynamic Attribute Fields */}
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Additional Attributes</h4>
          {Object.entries(form.attributes).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={key}
                disabled
                className="border p-2 rounded bg-gray-100 w-1/3"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => handleAttrChange(key, e.target.value)}
                className="border p-2 rounded w-1/2"
              />
              <button
                type="button"
                onClick={() => handleAttrRemove(key)}
                className="text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}

          <div className="flex items-center space-x-2 mt-2">
            <input
              type="text"
              placeholder="Attribute Key"
              value={newAttrKey}
              onChange={(e) => setNewAttrKey(e.target.value)}
              className="border p-2 rounded w-1/3"
            />
            <input
              type="text"
              placeholder="Attribute Value"
              value={newAttrValue}
              onChange={(e) => setNewAttrValue(e.target.value)}
              className="border p-2 rounded w-1/2"
            />
            <button
              type="button"
              onClick={handleAttrAdd}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
        >
          {item ? 'Update' : 'Add'} Item
        </button>
        {message && <p className="text-blue-600 mt-2">{message}</p>}
      </form>
    </div>
  );
}
