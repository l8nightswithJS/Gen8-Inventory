import { useEffect, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const LABELS = {
  opening_balance: 'Opening Balance',
  import: 'Import / Receipt',
  receipt: 'Receipt',
  transfer: 'Transfer',
  consumption: 'Consumption',
  adjustment: 'Adjustment',
  empty: 'Marked Empty',
  review_resolution: 'Review Resolution',
};

export default function MovementHistoryModal({ item, onClose }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/items/${item.id}/movements`);
        if (active) setMovements(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.message || 'Failed to load movement history.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [item.id]);

  const displayName = item?.name || item?.description || item?.part_number || 'Container';

  return (
    <BaseModal
      isOpen={!!item}
      onClose={onClose}
      title={`History: ${displayName}`}
      size="max-w-4xl"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
        <span>Container: <span className="font-mono">{item.barcode}</span></span>
        <span>Part: {item.part_number || '—'}</span>
        <span>Lot: {item.lot_number || '—'}</span>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading history…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2 text-right">Quantity</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-500">
                    No movement history recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {new Date(movement.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                      {LABELS[movement.movement_type] || movement.movement_type}
                    </td>
                    <td className="px-3 py-2">{movement.from_location_code || '—'}</td>
                    <td className="px-3 py-2">{movement.to_location_code || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {movement.quantity} {movement.uom || item.uom || ''}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{movement.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
}
