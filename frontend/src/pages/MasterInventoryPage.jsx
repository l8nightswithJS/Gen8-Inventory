import { useEffect, useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import { FiAlertTriangle, FiChevronDown, FiMapPin } from 'react-icons/fi';

function totalsByUom(items = []) {
  const totals = new Map();
  items.forEach((item) => {
    const uom = item.uom || 'unassigned UOM';
    const qty = Number(item.quantity);
    totals.set(uom, (totals.get(uom) || 0) + (Number.isFinite(qty) ? qty : 0));
  });
  return [...totals.entries()].map(([uom, qty]) => `${qty} ${uom}`).join(' · ');
}

function locationTitle(location) {
  if (location.location_type === 'staging') return 'Receiving / STAGING';
  const parts = [
    location.zone,
    location.rack ? `Rack ${location.rack}` : null,
    location.shelf ? `Shelf ${location.shelf}` : null,
    location.bin_position ? `Bin ${location.bin_position}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : location.location_description || location.location_code;
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
        setError(requestError?.response?.data?.message || 'Failed to load inventory data.');
      } finally {
        setLoading(false);
      }
    };
    fetchMasterView();
  }, []);

  const totals = useMemo(() => {
    const items = locations.flatMap((location) => location.items || []);
    return {
      locations: locations.length,
      containers: items.length,
      review: items.filter((item) => item.review_status === 'needs_review').length,
      parts: new Set(items.map((item) => `${item.client_id}:${item.part_number}`).filter(Boolean)).size,
    };
  }, [locations]);

  if (loading) return <p className="p-8 text-center text-slate-500">Loading master inventory…</p>;
  if (error) return <p className="p-8 text-center text-red-600">{error}</p>;

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Master Inventory View
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Warehouse-wide view of physical containers and their fixed locations.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Active locations', totals.locations],
          ['Containers in stock', totals.containers],
          ['Unique client / parts', totals.parts],
          ['Needs review', totals.review],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {locations.map((location) => {
          const summary = totalsByUom(location.items);
          const open = openLocationId === location.location_id;
          return (
            <div
              key={location.location_id}
              className={`overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-900 ${
                location.needs_allocation
                  ? 'border-amber-300 dark:border-amber-500/40'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <button
                onClick={() => setOpenLocationId(open ? null : location.location_id)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                      {location.location_code}
                    </span>
                    {location.location_type === 'staging' && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">STAGING</span>
                    )}
                    {location.needs_allocation && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        <FiAlertTriangle /> Needs Allocation
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{locationTitle(location)}</p>
                  {location.location_barcode && (
                    <p className="mt-1 font-mono text-xs text-slate-400">{location.location_barcode}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-4 text-right">
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {location.record_count} container(s) · {location.unique_part_count} unique part(s)
                    </p>
                    <p className="text-xs text-slate-500">{summary || 'Empty'}</p>
                  </div>
                  <FiChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {open && (
                <div className="border-t border-slate-200 dark:border-slate-800">
                  {location.items.length === 0 ? (
                    <p className="p-5 text-center text-sm text-slate-500">This location is empty.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[1100px] w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50">
                          <tr>
                            <th className="px-3 py-3">Client</th>
                            <th className="px-3 py-3">Part #</th>
                            <th className="px-3 py-3">Item / Description</th>
                            <th className="px-3 py-3">Lot</th>
                            <th className="px-3 py-3">Container Barcode</th>
                            <th className="px-3 py-3">Container</th>
                            <th className="px-3 py-3 text-right">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {location.items.map((item) => (
                            <tr key={item.item_id} className="border-t border-slate-100 dark:border-slate-800">
                              <td className="px-3 py-3 font-medium">{item.client_name}</td>
                              <td className="px-3 py-3 font-mono">{item.part_number || '—'}</td>
                              <td className="max-w-sm px-3 py-3">
                                <p className="font-medium text-slate-800 dark:text-slate-200">{item.name || item.item_description || '—'}</p>
                                {item.name && item.item_description && item.name !== item.item_description && (
                                  <p className="mt-1 text-xs text-slate-500">{item.item_description}</p>
                                )}
                              </td>
                              <td className="px-3 py-3 font-mono">{item.lot_number || '—'}</td>
                              <td className="px-3 py-3 font-mono text-xs">{item.barcode || '—'}</td>
                              <td className="px-3 py-3 capitalize">{item.container_status || 'available'}</td>
                              <td className="px-3 py-3 text-right font-bold tabular-nums">
                                {item.quantity} {item.uom || ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <FiMapPin /> Fixed locations use G8L barcodes; movable inventory containers use G8I barcodes.
      </div>
    </div>
  );
}
