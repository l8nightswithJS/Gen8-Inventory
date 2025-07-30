// src/components/EditItemModal.jsx
import React, { useState, useEffect } from 'react'
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
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setForm({
        name:                item.name || '',
        part_number:         item.part_number || '',
        description:         item.description || '',
        quantity:            item.quantity != null ? String(item.quantity) : '',
        location:            item.location || '',
        has_lot:             !!item.has_lot,
        lot_number:          item.lot_number || '',
        low_stock_threshold: item.low_stock_threshold != null
                               ? String(item.low_stock_threshold)
                               : '',
        alert_enabled:       !!item.alert_enabled,
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

  const validate = () => {
    if (!form.name.trim() || !form.part_number.trim()) {
      setError('Name and Part # are required.')
      return false
    }
    const qty = parseInt(form.quantity, 10)
    if (isNaN(qty) || qty < 0) {
      setError('Quantity must be non-negative.')
      return false
    }
    const threshold = form.low_stock_threshold
      ? parseInt(form.low_stock_threshold, 10)
      : 0
    if (isNaN(threshold) || threshold < 0) {
      setError('Threshold must be non-negative.')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      name:                form.name.trim(),
      part_number:         form.part_number.trim(),
      description:         form.description.trim(),
      quantity:            parseInt(form.quantity, 10),
      location:            form.location.trim(),
      has_lot:             form.has_lot,
      lot_number:          form.has_lot ? form.lot_number.trim() : '',
      low_stock_threshold: form.low_stock_threshold
                             ? parseInt(form.low_stock_threshold, 10)
                             : 0,
      alert_enabled:       form.alert_enabled,
    }

    setSubmitting(true)
    try {
      // Perform update and grab the updated row(s)
      const resp = await axios.put(`/api/items/${item.id}`, payload)
      // Supabase returns an array of updated rows
      const updatedItem = Array.isArray(resp.data) ? resp.data[0] : resp.data

      // Notify parent with the updated item
      // If onUpdated returns a promise, await it; otherwise it'll be no-op
      await onUpdated(updatedItem)

      // Now close the modal
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to update item.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
          disabled={submitting}
        >
          &times;
        </button>

        <h3 className="text-xl font-semibold text-gray-800">
          Edit Inventory Item
        </h3>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={submitting}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Part Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Part Number
            </label>
            <input
              name="part_number"
              value={form.part_number}
              onChange={handleChange}
              required
              disabled={submitting}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              disabled={submitting}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              name="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={handleChange}
              disabled={submitting}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              disabled={submitting}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Track Lot Number */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="has_lot"
              checked={form.has_lot}
              onChange={handleChange}
              disabled={submitting}
              className="h-4 w-4 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="text-sm text-gray-700">
              Track Lot Number
            </label>
          </div>

          {/* Lot Number */}
          {form.has_lot && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lot Number
              </label>
              <input
                name="lot_number"
                value={form.lot_number}
                onChange={handleChange}
                disabled={submitting}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Low-Stock Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Low-Stock Threshold
            </label>
            <input
              name="low_stock_threshold"
              type="number"
              min="0"
              placeholder="e.g. 10"
              value={form.low_stock_threshold}
              onChange={handleChange}
              disabled={submitting}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Enable Low-Stock Alert */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="alert_enabled"
              checked={form.alert_enabled}
              onChange={handleChange}
              disabled={submitting}
              className="h-4 w-4 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="text-sm text-gray-700">
              Enable Low-Stock Alert
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded disabled:opacity-50"
          >
            {submitting ? 'Updating…' : 'Update Item'}
          </button>
        </form>
      </div>
    </div>
  )
}
