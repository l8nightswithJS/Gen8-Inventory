// src/pages/AlertsPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';

const THRESHOLD_LABELS = {
  low_stock_threshold: 'Low-Stock Threshold',
  reorder_level: 'Reorder Level',
};

const ROWS_PER_PAGE = 12;

export default function AlertsPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!clientId) {
      setError('No client specified.');
      setAlerts([]);
      setLoading(false);
      return;
    }
    try {
      // The backend API is the single source of truth for alerts.
      // We will render the data exactly as it comes from this endpoint.
      const { data } = await axios.get('/api/items/alerts', {
        params: { client_id: Number(clientId) },
      });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setAlerts([]);
      setError('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
      setPage(1);
    }
  }, [clientId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const acknowledge = async (itemId) => {
    // Optimistically remove the alert from the UI
    setAlerts((prev) => prev.filter((a) => a.id !== itemId));
    try {
      await axios.post(`/api/items/alerts/${itemId}/acknowledge`, null);
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
      // On failure, reload data from the server to re-sync the UI
      await loadAlerts();
    }
  };

  const totalPages = Math.max(1, Math.ceil(alerts.length / ROWS_PER_PAGE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return alerts.slice(start, start + ROWS_PER_PAGE);
  }, [alerts, page]);

  if (loading) return <p className="p-4">Loading alerts…</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!alerts.length)
    return <p className="p-4 text-gray-700">No active low-stock alerts.</p>;

  const Pager = () => (
    <div className="flex items-center justify-end gap-3 text-sm text-gray-700">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Prev
      </button>
      <span className="inline-block px-1">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="text-blue-600 hover:underline"
        >
          ← Back
        </button>
        <Pager />
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-white shadow rounded">
        <table className="w-full table-auto text-sm">
          <thead className="sticky top-0 z-10 bg-white">
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
            {pageItems.map((alert) => (
              <tr key={alert.id} className="border-t bg-red-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Low
                    </span>
                    <span className="break-words">
                      {alert.item?.attributes?.name ??
                        alert.item?.attributes?.part_number ??
                        `Item ${alert.id}`}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-center">{alert.qty ?? '—'}</td>
                <td className="px-4 py-2 text-center">
                  {alert.threshold ?? '—'}
                </td>
                <td className="px-4 py-2">
                  {THRESHOLD_LABELS[alert.reason] ?? '—'}
                </td>
                <td className="px-4 py-2">
                  {alert.triggered_at
                    ? new Date(alert.triggered_at).toLocaleString()
                    : '—'}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => acknowledge(alert.id)}
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

      <div className="mt-3">
        <Pager />
      </div>
    </div>
  );
}
