// src/pages/AlertsPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';

// Shared helpers (same logic as table)
const getNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const getQty = (a) =>
  getNumber(a?.quantity ?? a?.on_hand ?? a?.qty_in_stock ?? a?.stock ?? 0);
const getThreshold = (a) =>
  getNumber(a?.low_stock_threshold ?? a?.reorder_point ?? a?.safety_stock ?? 0);
const isEnabled = (a) => (a?.alert_enabled === false ? false : true);

export default function AlertsPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Normalize possible API shapes -> our alert rows
  const normalizeApiAlerts = (data) => {
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => {
        const itemObj = row.item || row; // some APIs return { item: {...} }
        const attrs = itemObj.attributes || itemObj;
        const qty = getQty(attrs);
        const th = getThreshold(attrs);
        const enabled = isEnabled(attrs);
        if (
          !(enabled && Number.isFinite(qty) && Number.isFinite(th) && qty <= th)
        ) {
          return null;
        }
        return {
          id: itemObj.id,
          name: attrs.name ?? attrs.part_number ?? `Item ${itemObj.id}`,
          qty,
          threshold: th,
          triggered_at: row.triggered_at || itemObj.updated_at || null,
        };
      })
      .filter(Boolean);
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
        const normalized = normalizeApiAlerts(data);
        setAlerts(normalized);
        setError('');
      } catch (e) {
        // Fallback: derive from items client-side
        try {
          const { data: items } = await axios.get('/api/items', {
            params: { client_id: parseInt(clientId, 10) },
          });
          const derived = Array.isArray(items)
            ? items
                .map((it) => {
                  const attrs = it.attributes || {};
                  const qty = getQty(attrs);
                  const th = getThreshold(attrs);
                  const enabled = isEnabled(attrs);
                  if (
                    enabled &&
                    Number.isFinite(qty) &&
                    Number.isFinite(th) &&
                    qty <= th
                  ) {
                    return {
                      id: it.id,
                      name: attrs.name ?? attrs.part_number ?? `Item ${it.id}`,
                      qty,
                      threshold: th,
                      triggered_at: it.updated_at || null,
                    };
                  }
                  return null;
                })
                .filter(Boolean)
            : [];
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
      // keep silent if backend no-ops; UI already updated
    }
  };

  if (loading) return <p className="p-4">Loading alerts…</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!alerts.length)
    return <p className="p-4 text-gray-700">No active low‑stock alerts.</p>;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="text-blue-600 hover:underline mr-4"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold">Low‑Stock Alerts</h2>
      </div>

      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full text-sm table-auto">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-center">Qty</th>
              <th className="px-4 py-2 text-center">Threshold</th>
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
                    <span>{a.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-center">{a.qty}</td>
                <td className="px-4 py-2 text-center">{a.threshold}</td>
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
  );
}
