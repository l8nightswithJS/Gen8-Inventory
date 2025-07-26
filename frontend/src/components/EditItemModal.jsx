import React, { useEffect, useState } from 'react'
import axios from '../utils/axiosConfig'

export default function EditItemModal({ item, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    quantity: '',
    location: '',
    has_lot: false,
    lot_number: '',
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
        has_lot: !!item.has_lot,
        lot_number: item.lot_number || '',
        low_stock_threshold:
          item.low_stock_threshold != null
            ? String(item.low_stock_threshold)
            : '',
        alert_enabled: !!item.alert_enabled,
      })
    }
  }, [item])

  const handleChange = e => {
    const { name, type, checked, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim() || !form.part_number.trim()) {
      setError('Name and Part # are required.')
      return
    }
    const qty = parseInt(form.quantity, 10)
    if (isNaN(qty) || qty < 0) {
      setError('Quantity must be non‑negative.')
      return
    }
    const threshold = form.low_stock_threshold
      ? parseInt(form.low_stock_threshold, 10)
      : 0
    if (isNaN(threshold) || threshold < 0) {
      setError('Threshold must be non‑negative.')
      return
    }

    try {
      await axios.put(`/api/items/${item.id}`, {
        name: form.name.trim(),
        part_number: form.part_number.trim(),
        description: form.description.trim(),
        quantity: qty,
        location: form.location.trim(),
        has_lot: form.has_lot,
        lot_number: form.has_lot
          ? form.lot_number.trim()
          : '',
        low_stock_threshold: threshold,
        alert_enabled: form.alert_enabled,
      })
      onUpdated()
      onClose()
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.message || 'Failed to update item.'
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
        >
          &times;
        </button>
        <h3 className="text-xl font-semibold text-gray-800">
          Edit Inventory Item
        </h3>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* name */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* part_number */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Part Number
            </label>
            <input
              name="part_number"
              value={form.part_number}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* description */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* quantity */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              name="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* location */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* lot toggle */}
          <div className="flex items-center space-x-2">
            <input
              id="edit_has_lot"
              name="has_lot"
              type="checkbox"
              checked={form.has_lot}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="edit_has_lot"
              className="text-sm text-gray-700"
            >
              Track Lot Number
            </label>
          </div>
          {form.has_lot && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Lot Number
              </label>
              <input
                name="lot_number"
                value={form.lot_number}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {/* low-stock */}
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="edit_alert_enabled"
              name="alert_enabled"
              type="checkbox"
              checked={form.alert_enabled}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="edit_alert_enabled"
              className="text-sm text-gray-700"
            >
              Enable Low‑Stock Alert
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded"
          >
            Update Item
          </button>
        </form>
      </div>
    </div>
  )
}
