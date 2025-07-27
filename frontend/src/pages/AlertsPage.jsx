// src/pages/AlertsPage.jsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from '../utils/axiosConfig'

export default function AlertsPage() {
  const { clientId } = useParams()
  const navigate     = useNavigate()
  const [alerts, setAlerts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function loadAlerts() {
      if (!clientId) {
        setError('No client specified.')
        setLoading(false)
        return
      }
      try {
        const { data } = await axios.get('/api/items/alerts', {
          params: { client_id: parseInt(clientId, 10) },
        })
        // API returns an array where some entries have item: null
        const valid = Array.isArray(data)
          ? data.filter(a => a.item && typeof a.item === 'object')
          : []
        setAlerts(valid)
        setError('')
      } catch {
        setAlerts([])
        setError('Failed to load alerts.')
      } finally {
        setLoading(false)
      }
    }
    loadAlerts()
  }, [clientId])

  const acknowledge = async itemId => {
    if (!itemId) {
      alert('Cannot acknowledge: no item specified.')
      return
    }
    try {
      await axios.post(`/api/items/alerts/${itemId}/acknowledge`)
      // drop alerts for that item
      setAlerts(prev => prev.filter(a => a.item.id !== itemId))
    } catch {
      alert('Failed to acknowledge alert.')
    }
  }

  if (loading) return <p className="p-4">Loading alerts…</p>
  if (error)   return <p className="p-4 text-red-600">{error}</p>
  if (!alerts.length)
    return <p className="p-4 text-gray-700">No active low‑stock alerts.</p>

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="text-blue-600 hover:underline mr-4"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold">
          Low‑Stock Alerts for Client {clientId}
        </h2>
      </div>

      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full text-sm table-auto">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-center">Qty</th>
              <th className="px-4 py-2 text-center">Threshold</th>
              <th className="px-4 py-2 text-left">Triggered At</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(a => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">{a.item.name}</td>
                <td className="px-4 py-2 text-center">{a.item.quantity}</td>
                <td className="px-4 py-2 text-center">
                  {a.item.low_stock_threshold}
                </td>
                <td className="px-4 py-2">
                  {new Date(a.triggered_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => acknowledge(a.item.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                  >
                    Acknowledge
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
