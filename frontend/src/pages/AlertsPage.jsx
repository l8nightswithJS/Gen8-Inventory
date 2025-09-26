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
  // ✅ FIX: Access name and part_number directly from the nested item object
  const name =
    alert.item?.name ?? alert.item?.part_number ?? `Item ${alert.item.id}`;

  return (
    <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-slate-800/50 shadow-md p-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Threshold Type:{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {THRESHOLD_LABELS[alert.reason] ?? '—'}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-red-100 dark:bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
          Low Stock
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 dark:text-slate-400">Current Qty</p>
          <p className="font-bold text-lg text-slate-800 dark:text-white">
            {alert.qty ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Threshold</p>
          <p className="font-bold text-lg text-slate-800 dark:text-white">
            {alert.threshold ?? '—'}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
        {/* ✅ FIX: Pass the correct nested ID */}
        <Button
          onClick={() => onAcknowledge(alert.item.id)}
          size="sm"
          variant="primary"
        >
          Acknowledge
        </Button>
      </div>
    </div>
  );
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [client, setClient] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('desktop');

  const { clientId } = useParams();
  const navigate = useNavigate();

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/items/alerts', {
        params: {
          client_id: clientId,
          page: page,
          limit: ROWS_PER_PAGE,
        },
      });
      setAlerts(data || []);
      setTotal(data.length || 0);
    } catch (e) {
      console.error('Failed to fetch alerts', e);
    }
  }, [clientId, page]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const acknowledge = async (itemId) => {
    try {
      await api.post(`/api/items/alerts/${itemId}/acknowledge`);
      fetchAlerts(); // Re-fetch after acknowledging
    } catch (e) {
      console.error('Failed to acknowledge alert', e);
    }
  };

  const totalPages = useMemo(() => Math.ceil(total / ROWS_PER_PAGE), [total]);

  const Pager = () => (
    <div className="flex justify-center items-center gap-2 mt-4">
      <Button onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
        Prev
      </Button>
      <span>
        Page {page} of {totalPages}
      </span>
      <Button
        onClick={() => setPage((p) => p + 1)}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </div>
  );

  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchClient = async () => {
      if (!clientId) return;
      try {
        const { data } = await api.get(`/api/clients/${clientId}`);
        setClient(data);
      } catch (error) {
        console.error('Failed to fetch client details', error);
      }
    };
    fetchClient();
  }, [clientId]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Alerts for: {client?.name ?? '...'}
        </h1>
        <Button
          onClick={() => navigate(`/clients/${clientId}`)}
          variant="secondary"
        >
          Back to Client
        </Button>
      </div>

      {viewMode === 'mobile' ? (
        <div>
          {alerts.map((alert) => (
            <AlertCard
              // ✅ FIX: Use the nested item ID for the key
              key={alert.item.id}
              alert={alert}
              onAcknowledge={acknowledge}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 shadow-md rounded-lg">
          <table className="w-full table-auto border-collapse text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Item
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                  Current Qty
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                  Threshold
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Reason
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Triggered
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.map((alert) => (
                // ✅ FIX: Use the nested item ID for the key
                <tr key={alert.item.id}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                        Low
                      </span>
                      <span className="break-words text-slate-800 dark:text-slate-200">
                        {/* ✅ FIX: Access name and part_number from the item object */}
                        {alert.item?.name ?? alert.item?.part_number}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center text-slate-700 dark:text-slate-300">
                    {alert.qty ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-center text-slate-700 dark:text-slate-300">
                    {alert.threshold ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {THRESHOLD_LABELS[alert.reason] ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {alert.triggered_at
                      ? new Date(alert.triggered_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      // ✅ FIX: Pass the correct nested ID
                      onClick={() => acknowledge(alert.item.id)}
                      size="sm"
                      variant="primary"
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
