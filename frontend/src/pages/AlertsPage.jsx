// src/pages/AlertsPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import Button from '../components/ui/Button';

const THRESHOLD_LABELS = {
  low_stock_threshold: 'Low-Stock Threshold',
  reorder_level: 'Reorder Level',
};

const ROWS_PER_PAGE = 12;

const AlertCard = ({ alert, onAcknowledge }) => {
  const name =
    alert.item?.attributes?.name ??
    alert.item?.attributes?.part_number ??
    `Item ${alert.id}`;

  return (
    <div className="rounded-lg border border-red-200 bg-white shadow-md p-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-800">{name}</p>
          <p className="text-sm text-slate-500 mt-1">
            Threshold Type:{' '}
            <span className="font-medium text-slate-600">
              {THRESHOLD_LABELS[alert.reason] ?? '—'}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          Low
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-center border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-500">Current Qty</p>
          <p className="font-bold text-xl text-red-600">{alert.qty ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Threshold</p>
          <p className="font-bold text-xl text-slate-700">
            {alert.threshold ?? '—'}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button
          onClick={() => onAcknowledge(alert.id)}
          variant="success"
          size="md"
          className="w-full"
        >
          Acknowledge
        </Button>
      </div>
    </div>
  );
};

export default function AlertsPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      window.innerWidth < 768 ? setViewMode('mobile') : setViewMode('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    if (!clientId) {
      setError('No client specified.');
      setAlerts([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/api/items/alerts', {
        params: { client_id: Number(clientId) },
      });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError('Failed to load alerts.');
    } finally {
      setLoading(false);
      setPage(1);
    }
  }, [clientId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const acknowledge = async (itemId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== itemId));
    try {
      await api.post(`/api/items/alerts/${itemId}/acknowledge`);
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
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

  const Pager = () => (
    <div className="my-4 flex flex-col sm:flex-row items-center sm:justify-between gap-3 text-sm text-gray-700">
      <div className="font-medium">
        Total alerts: <span className="font-bold">{alerts.length}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1.5 border rounded disabled:opacity-50 bg-white hover:bg-gray-50"
        >
          Prev
        </button>
        <span className="tabular-nums">
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-3 py-1.5 border rounded disabled:opacity-50 bg-white hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );

  if (loading) return <p className="p-4">Loading alerts…</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="flex h-full min-h-0 flex-col max-w-6xl mx-auto">
      <button
        onClick={() => navigate(`/clients/${clientId}`)}
        className="text-blue-600 hover:underline mb-4 self-start text-sm"
      >
        ← Back to Inventory
      </button>

      {alerts.length === 0 ? (
        <p className="p-4 text-gray-700">No active low-stock alerts.</p>
      ) : viewMode === 'mobile' ? (
        <div className="w-full max-w-lg mx-auto">
          {pageItems.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={acknowledge}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto bg-white shadow rounded">
          <table className="w-full table-auto text-sm">
            <thead className="sticky top-0 z-10 bg-white border-b">
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
                          alert.item?.attributes?.part_number}
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
                    <Button
                      onClick={() => acknowledge(alert.id)}
                      size="sm"
                      variant="success"
                    >
                      Acknowledge
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {alerts.length > 0 && <Pager />}
    </div>
  );
}
