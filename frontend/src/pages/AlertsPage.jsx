// src/pages/AlertsPage.jsx
import React, { useEffect, useState } from 'react'
import { useParams, Link }           from 'react-router-dom'
import axios                          from '../utils/axiosConfig'

export default function AlertsPage() {
  const { clientId } = useParams()          // will be undefined on the global /alerts page
  const [alerts, setAlerts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const fetchAlerts = async () => {
    setLoading(true)
    setError('')
    try {
      // base endpoint is mounted at /api/items in server.js
      const endpoint = clientId
        ? `/api/items/alerts?client_id=${clientId}`
        : '/api/items/alerts'
      const { data } = await axios.get(endpoint)
      setAlerts(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load alerts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    // re-fetch whenever clientId changes
  }, [clientId])

  const acknowledge = async (itemId) => {
    try {
      await axios.post(`/api/items/alerts/${itemId}/acknowledge`)
      // remove acknowledged alert
      setAlerts((prev) => prev.filter((a) => a.items.id !== itemId))
    } catch {
      alert('Failed to acknowledge alert.')
    }
  }

  // --- render logic ---

  if (loading) return <p className="p-4">Loading alerts…</p>
  if (error)   return <p className="p-4 text-red-600">{error}</p>

  if (alerts.length === 0) {
    return (
      <div className="px-4 py-6 max-w-5xl mx-auto">
        <p className="text-gray-700">
          {clientId
            ? `No active low‑stock alerts for client #${clientId}.`
            : 'No active low‑stock alerts.'}
        </p>
        {clientId && (
          <Link
            to={`/clients/${clientId}`}
            className="mt-4 inline-block text-blue-600 hover:underline text-sm"
          >
            ← Back to client
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Low‑Stock Alerts</h2>

      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full text-sm table-auto">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Client ID</th>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-center">Qty</th>
              <th className="px-4 py-2 text-center">Threshold</th>
              <th className="px-4 py-2 text-left">Triggered At</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">{a.items.client_id}</td>
                <td className="px-4 py-2">{a.items.name}</td>
                <td className="px-4 py-2 text-center">
                  {a.items.quantity}
                </td>
                <td className="px-4 py-2 text-center">
                  {a.items.low_stock_threshold}
                </td>
                <td className="px-4 py-2">
                  {new Date(a.triggered_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => acknowledge(a.items.id)}
                    className="bg-green-600 hover:bg-green-700 text-white
                               px-3 py-1 rounded text-xs transition"
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
