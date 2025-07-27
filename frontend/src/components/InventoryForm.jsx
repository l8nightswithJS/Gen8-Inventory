// src/components/InventoryForm.jsx
import React, { useState, useEffect } from 'react'
import axios from '../utils/axiosConfig'

export default function InventoryForm({ clientId, item, onClose, onSuccess }) {
  // only the fields our API wants:
  const [values, setValues] = useState({
    name: '',
    part_number: '',
    description: '',
    quantity: 0,
    location: '',
    has_lot: false,
    lot_number: '',
    low_stock_threshold: 0,
    alert_enabled: false,
  })

  // load existing item into form
  useEffect(() => {
    if (item && item.id) {
      setValues({
        name: item.name || '',
        part_number: item.part_number || '',
        description: item.description || '',
        quantity: item.quantity || 0,
        location: item.location || '',
        has_lot: item.has_lot || false,
        lot_number: item.lot_number || '',
        low_stock_threshold: item.low_stock_threshold || 0,
        alert_enabled: item.alert_enabled || false,
      })
    }
  }, [item])

  const handleChange = e => {
    const { name, type, checked, value } = e.target
    setValues(v => ({
      ...v,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    // build a clean payload—no stray id/last_updated/etc.
    const payload = {
      client_id: Number(clientId),
      name: values.name,
      part_number: values.part_number,
      description: values.description,
      quantity: Number(values.quantity),
      location: values.location,
      has_lot: values.has_lot,
      lot_number: values.lot_number,
      low_stock_threshold: Number(values.low_stock_threshold),
      alert_enabled: values.alert_enabled,
    }

    try {
      let res
      if (item && item.id) {
        // use PATCH, not PUT
        res = await axios.patch(`/api/items/${item.id}`, payload)
      } else {
        res = await axios.post('/api/items', payload)
      }
      onSuccess(res.data) // merge into your table state
      onClose()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Save failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Name</label>
        <input
          name="name"
          value={values.name}
          onChange={handleChange}
          required
          className="w-full border px-2 py-1"
        />
      </div>
      <div>
        <label>Part #</label>
        <input
          name="part_number"
          value={values.part_number}
          onChange={handleChange}
          required
          className="w-full border px-2 py-1"
        />
      </div>
      <div>
        <label>Description</label>
        <textarea
          name="description"
          value={values.description}
          onChange={handleChange}
          className="w-full border px-2 py-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Quantity</label>
          <input
            name="quantity"
            type="number"
            value={values.quantity}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label>Location</label>
          <input
            name="location"
            value={values.location}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <label>
          <input
            name="has_lot"
            type="checkbox"
            checked={values.has_lot}
            onChange={handleChange}
          />{' '}
          Track Lot Number
        </label>
        {values.has_lot && (
          <input
            name="lot_number"
            placeholder="Lot #"
            value={values.lot_number}
            onChange={handleChange}
            className="border px-2 py-1"
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Low‑Stock Threshold</label>
          <input
            name="low_stock_threshold"
            type="number"
            value={values.low_stock_threshold}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            name="alert_enabled"
            type="checkbox"
            checked={values.alert_enabled}
            onChange={handleChange}
          />
          <label>Enable Low‑Stock Alert</label>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 border">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white">
          Save
        </button>
      </div>
    </form>
  )
}
