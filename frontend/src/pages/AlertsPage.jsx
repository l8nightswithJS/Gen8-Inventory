import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import Button from '../components/ui/Button';

const THRESHOLD_LABELS = {
  low_stock_threshold: 'Low-Stock Threshold',
  reorder_level: 'Reorder Level',
  minimum_quantity: 'Minimum Quantity',
  out_of_stock: 'Zero Quantity',
};

const ROWS_PER_PAGE = 12;

function alertStatus(alert) {
  if (alert.status) return alert.status;
  return Number(alert.qty) <= 0 ? 'out_of_stock' : 'low_stock';
}

const STATUS_LABELS = {
  low_stock: 'Low Stock',
  critical: 'Critical',
  out_of_stock: 'Out of Stock',
};

const STATUS_CLASSES = {
  low_stock:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  critical:
    'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
  out_of_stock: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
};

const displayQuantity = (value, uom) =>
  `${value ?? '—'}${uom ? ` ${uom}` : ''}`;

const AlertCard = ({ alert, onAcknowledge }) => {
  const name =
    alert.item?.name ??
    alert.item?.description ??
    alert.item?.part_number ??
    `Item ${alert.item?.id}`;
  const status = alertStatus(alert);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-md p-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {alert.item?.part_number || 'No part number'}
            {alert.item?.lot_number ? ` · Lot ${alert.item.lot_number}` : ''}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Threshold Type:{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {THRESHOLD_LABELS[alert.reason] ?? '—'}
            </span>
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}
        >
          {STATUS_LABELS[status] || status}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 dark:text-slate-400">Current Qty</p>
          <p className="font-bold text-lg text-slate-800 dark:text-white">
            {displayQuantity(alert.qty, alert.item?.uom)}
          </p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Threshold</p>
          <p className="font-bold text-lg text-slate-800 dark:text-white">
            {displayQuantity(alert.threshold, alert.item?.uom)}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
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
  const [viewMode, setViewMode] = useState('desktop');
  const [error, setError] = useState('');

  const { clientId } = useParams();
  const navigate = useNavigate();

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/items/alerts', {
        params: { client_id: clientId },
      });
      setAlerts(Array.isArray(data) ? data : []);
      setError('');
    } catch (requestError) {
      console.error('Failed to fetch alerts', requestError);
      setError(
        requestError?.response?.data?.message || 'Failed to load alerts.',
      );
    }
  }, [clientId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const acknowledge = async (itemId) => {
    try {
      await api.post(`/api/items/alerts/${itemId}/acknowledge`);
      await fetchAlerts();
    } catch (requestError) {
      console.error('Failed to acknowledge alert', requestError);
      setError(
        requestError?.response?.data?.message ||
          'Failed to acknowledge the alert.',
      );
    }
  };

  const totalPages = Math.max(1, Math.ceil(alerts.length / ROWS_PER_PAGE));
  const pageAlerts = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return alerts.slice(start, start + ROWS_PER_PAGE);
  }, [alerts, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
      } catch (requestError) {
        console.error('Failed to fetch client details', requestError);
      }
    };
    fetchClient();
  }, [clientId]);

  const Pager = () => (
    <div className="flex justify-center items-center gap-2 mt-4">
      <Button onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>
        Prev
      </Button>
      <span>
        Page {page} of {totalPages}
      </span>
      <Button
        onClick={() => setPage((value) => value + 1)}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-4">
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

      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      {alerts.length === 0 && !error ? (
        <p className="rounded-lg bg-white p-6 text-center text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
          No active stock alerts.
        </p>
      ) : viewMode === 'mobile' ? (
        <div>
          {pageAlerts.map((alert) => (
            <AlertCard
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
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Item</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">Current Qty</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">Threshold</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Reason</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageAlerts.map((alert) => {
                const status = alertStatus(alert);
                return (
                  <tr key={alert.item.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {alert.item?.name ??
                          alert.item?.description ??
                          alert.item?.part_number}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {alert.item?.part_number || '—'}
                        {alert.item?.lot_number
                          ? ` · Lot ${alert.item.lot_number}`
                          : ''}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-center text-slate-700 dark:text-slate-300">
                      {displayQuantity(alert.qty, alert.item?.uom)}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-700 dark:text-slate-300">
                      {displayQuantity(alert.threshold, alert.item?.uom)}
                    </td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      {THRESHOLD_LABELS[alert.reason] ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}
                      >
                        {STATUS_LABELS[status] || status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        onClick={() => acknowledge(alert.item.id)}
                        size="sm"
                        variant="primary"
                      >
                        Acknowledge
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {alerts.length > ROWS_PER_PAGE && <Pager />}
    </div>
  );
}
