import React, { useState, useEffect } from 'react'
import axios from '../utils/axiosConfig'

export default function InventoryForm({
  clientId,
  item = null,
  onSuccess,
  onClose,
}) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    quantity: '',
    location: '',
    lot_number: '',
    has_lot: false,
    low_stock_threshold: '',
    alert_enabled: false,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        part_number: item.part_number || '',
        description: item.description || '',
        quantity:
          item.quantity != null ? String(item.quantity) : '',
        location: item.location || '',
        lot_number: item.lot_number || '',
        has_lot: !!item.has_lot,
        low_stock_threshold:
          item.low_stock_threshold != null
            ? String(item.low_stock_threshold)
            : '',
        alert_enabled: !!item.alert_enabled,
      })
    }
  }, [item])

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validate = () => {
    if (!form.name.trim()) {
      setError('Name is required.')
      return false
    }
    if (!form.part_number.trim()) {
      setError('Part # is required.')
      return false
    }
    const q = parseInt(form.quantity, 10)
    if (isNaN(q) || q < 0) {
      setError('Quantity must be ≥ 0.')
      return false
    }
    if (form.low_stock_threshold !== '') {
      const t = parseInt(form.low_stock_threshold, 10)
      if (isNaN(t) || t < 0) {
        setError('Threshold must be ≥ 0.')
        return false
      }
    }
    setError('')
    return true
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      client_id: clientId,
      name: form.name.trim(),
      part_number: form.part_number.trim(),
      description: form.description,
      quantity: parseInt(form.quantity, 10),
      location: form.location,
      has_lot: form.has_lot,
      lot_number: form.has_lot ? form.lot_number : '',
      low_stock_threshold: form.low_stock_threshold
        ? parseInt(form.low_stock_threshold, 10)
        : 0,
      alert_enabled: form.alert_enabled,
    }

    try {
      if (item) {
        await axios.put(`/api/items/${item.id}`, payload)
      } else {
        await axios.post('/api/items', payload)
      }
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.message || 'Submission failed.'
      )
    }
  }

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
        type="number"
        min="0"
        placeholder="Quantity"
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

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Low‑Stock Threshold
        </label>
        <input
          name="low_stock_threshold"
          type="number"
          min="0"
          placeholder="e.g. 10"
          value={form.low_stock_threshold}
          onChange={handleChange}
          className="w-full border border-gray-300 px-3 py-2 rounded"
        />
      </div>

      <label className="flex items-center space-x-2">
        <input
          name="alert_enabled"
          type="checkbox"
          checked={form.alert_enabled}
          onChange={handleChange}
          className="h-4 w-4 rounded"
        />
        <span className="text-sm">Enable Low‑Stock Alert</span>
      </label>

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
  )
}
