// src/components/InventoryForm.jsx
import React, { useState, useEffect } from 'react'
import axios from '../utils/axiosConfig'

export default function InventoryForm({ clientId, item, onClose, onSuccess }) {
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
        // ← changed: use PUT against /api/items/:id
        res = await axios.put(`/api/items/${item.id}`, payload)
      } else {
        res = await axios.post('/api/items', payload)
      }
      onSuccess(res.data)
      onClose()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Save failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ... form fields unchanged ... */}
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
