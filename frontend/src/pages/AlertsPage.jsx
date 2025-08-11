// src/pages/AlertsPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { computeLowState } from '../utils/stockLogic';

const THRESHOLD_LABELS = {
  low_stock_threshold: 'Low-Stock Threshold',
  reorder_level: 'Reorder Level',
};

export default function AlertsPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toRow = (row) => {
    // support {item: {...}} or a raw item shape
    const itemObj = row?.item ?? row ?? {};
    const attrs = itemObj.attributes ?? itemObj ?? {};
    const { low, reason, threshold, qty } = computeLowState(attrs);

    if (!low) return null;
    return {
      id: itemObj.id,
      name: attrs.name ?? attrs.part_number ?? `Item ${itemObj.id}`,
      qty,
      threshold,
      reason,
      triggered_at: row?.triggered_at || itemObj.updated_at || null,
    };
  };

  useEffect(() => {
    async function loadAlerts() {
      if (!clientId) {
        setError('No client specified.');
        setLoading(false);
        return;
      }
      try {
        // Prefer server-computed alerts if available
        const { data } = await axios.get('/api/items/alerts', {
          params: { client_id: parseInt(clientId, 10) },
        });
        const normalized = (Array.isArray(data) ? data : [])
          .map(toRow)
          .filter(Boolean);
        setAlerts(normalized);
        setError('');
      } catch (e) {
        // Fallback: derive from all items client-side
        try {
          const { data: items } = await axios.get('/api/items', {
            params: { client_id: parseInt(clientId, 10) },
          });
          const derived = (Array.isArray(items) ? items : [])
            .map(toRow)
            .filter(Boolean);
          setAlerts(derived);
          setError('');
        } catch {
          setAlerts([]);
          setError('Failed to load alerts.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, [clientId]);

  const acknowledge = async (itemId) => {
    try {
      await axios.post(`/api/items/alerts/${itemId}/acknowledge`);
      setAlerts((prev) => prev.filter((a) => a.id !== itemId));
    } catch {
      // no-op; UI already updated
    }
  };

  if (loading) return <p className="p-4">Loading alerts…</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!alerts.length)
    return <p className="p-4 text-gray-700">No active low-stock alerts.</p>;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="text-blue-600 hover:underline mr-4"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold">Low-Stock Alerts</h2>
      </div>

      <div className="bg-white shadow rounded">
        {/* Sticky header within a scrollable area */}
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full table-auto text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="text-xs uppercase text-gray-600">
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-center">Qty</th>
                <th className="px-4 py-2 text-center">Threshold</th>
                <th className="px-4 py-2 text-left">Threshold&nbsp;Type</th>
                <th className="px-4 py-2 text-left">Triggered</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-t bg-red-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Low
                      </span>
                      <span className="break-words">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">{a.qty ?? '—'}</td>
                  <td className="px-4 py-2 text-center">
                    {a.threshold ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    {a.reason ? THRESHOLD_LABELS[a.reason] : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {a.triggered_at
                      ? new Date(a.triggered_at).toLocaleString()
                      : '—'}
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
    </div>
  );
}
