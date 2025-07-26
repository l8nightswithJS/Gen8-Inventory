import React, { useEffect, useState } from 'react'
import { useParams }                  from 'react-router-dom'
import axios                          from '../utils/axiosConfig'

export default function AlertsPage() {
  const { clientId } = useParams()
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    async function fetchAlerts() {
      if (!clientId) {
        setError('No client specified.')
        setLoading(false)
        return
      }
      try {
        const { data } = await axios.get('/api/items/alerts', {
          params: { client_id: parseInt(clientId, 10) }
        })
        setAlerts(data)
      } catch (err) {
        console.error('Error loading alerts:', err)
        setError('Failed to load alerts.')
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [clientId])

  const acknowledgeAlert = async (itemId) => {
    try {
      await axios.post(`/api/items/alerts/${itemId}/acknowledge`)
      setAlerts(prev => prev.filter(a => a.items.id !== itemId))
    } catch (err) {
      console.error('Error acknowledging alert:', err)
      alert('Failed to acknowledge alert.')
    }
  }

  if (loading) return <p className="p-4">Loading alerts…</p>
  if (error)   return <p className="p-4 text-red-600">{error}</p>
  if (alerts.length === 0) {
    return <p className="p-4 text-gray-700">No active low‑stock alerts.</p>
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">
        Low‑Stock Alerts for Client {clientId}
      </h2>
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
            {alerts.map((a) => (
              <tr key={a.id} className="border-t">
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
                    onClick={() => acknowledgeAlert(a.items.id)}
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
