import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from '../utils/axiosConfig'

export default function AlertsPage() {
  const { clientId } = useParams()
  const navigate      = useNavigate()
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    async function loadAlerts() {
      if (!clientId) {
        setError('No client specified.')
        return setLoading(false)
      }
      try {
        const {
          data: { alerts: fetchedAlerts },
        } = await axios.get(`/api/items/${clientId}/alerts`)
        setAlerts(Array.isArray(fetchedAlerts) ? fetchedAlerts : [])
      } catch {
        setAlerts([])
        setError('Failed to load alerts.')
      } finally {
        setLoading(false)
      }
    }
    loadAlerts()
  }, [clientId])

  const acknowledge = async alertId => {
    // find the alert so we know its item_id
    const a = alerts.find(x => x.id === alertId)
    try {
      await axios.post(
        `/api/items/${a.item_id}/alerts/${alertId}/acknowledge`
      )
      setAlerts(prev => prev.filter(x => x.id !== alertId))
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
                {/* your API returns each alert joined with its item data */}
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
                    onClick={() => acknowledge(a.id)}
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
