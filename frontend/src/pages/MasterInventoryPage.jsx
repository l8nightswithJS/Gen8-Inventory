import { useState, useEffect } from 'react';
import api from '../utils/axiosConfig';
import { FiChevronDown } from 'react-icons/fi';

function summarizeLocation(items = []) {
  const totalsByUom = new Map();
  for (const item of items) {
    const uom = item.uom || 'unit';
    const quantity = Number(item.quantity);
    totalsByUom.set(uom, (totalsByUom.get(uom) || 0) + (Number.isFinite(quantity) ? quantity : 0));
  }

  if (totalsByUom.size === 0) return '';
  if (totalsByUom.size > 1) return 'mixed UOM';

  const [[uom, total]] = totalsByUom.entries();
  return `${total} ${uom}`;
}

export default function MasterInventoryPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLocationId, setOpenLocationId] = useState(null);

  useEffect(() => {
    const fetchMasterView = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/inventory/by-location');
        setLocations(Array.isArray(data) ? data : []);
        setError('');
      } catch (requestError) {
        console.error('Failed to load master inventory view:', requestError);
        setError('Failed to load inventory data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMasterView();
  }, []);

  const toggleLocation = (locationId) => {
    setOpenLocationId((previousId) =>
      previousId === locationId ? null : locationId,
    );
  };

  if (loading) {
    return (
      <p className="text-center p-8 text-slate-500 dark:text-slate-400">
        Loading master inventory...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center p-8 text-red-600 dark:text-red-400">{error}</p>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Master Inventory View
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          A complete overview of all stock across all warehouse locations.
        </p>
      </div>

      <div className="space-y-2">
        {locations.map((location) => {
          const summary = summarizeLocation(location.items);
          return (
            <div
              key={location.location_id}
              className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm"
            >
              <button
                onClick={() => toggleLocation(location.location_id)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-t-lg"
              >
                <div className="font-semibold text-lg text-slate-800 dark:text-white">
                  {location.location_code}
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {location.items.length} inventory record(s)
                    {summary ? ` · ${summary}` : ''}
                  </span>
                  <FiChevronDown
                    className={`transition-transform text-slate-500 dark:text-slate-400 ${
                      openLocationId === location.location_id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {openLocationId === location.location_id && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-4 overflow-x-auto">
                  {location.items.length > 0 ? (
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase">
                        <tr>
                          <th className="p-2">Client</th>
                          <th className="p-2">Part #</th>
                          <th className="p-2">Item</th>
                          <th className="p-2">Lot</th>
                          <th className="p-2">Description</th>
                          <th className="p-2 text-right">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {location.items.map((item) => (
                          <tr
                            key={item.item_id}
                            className="border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                          >
                            <td className="p-2 font-medium text-slate-600 dark:text-slate-300">
                              {item.client_name}
                            </td>
                            <td className="p-2 font-mono text-slate-700 dark:text-slate-300">
                              {item.part_number || '—'}
                            </td>
                            <td className="p-2 text-slate-700 dark:text-slate-300">
                              {item.name || item.item_description || '—'}
                            </td>
                            <td className="p-2 font-mono text-slate-600 dark:text-slate-400">
                              {item.lot_number || '—'}
                            </td>
                            <td className="p-2 text-slate-500 dark:text-slate-400">
                              {item.item_description || '—'}
                            </td>
                            <td className="p-2 text-right font-semibold text-slate-800 dark:text-white">
                              {item.quantity}
                              {item.uom ? ` ${item.uom}` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                      This location is empty.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
