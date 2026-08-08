import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ConfirmModal';
import AddLocationModal from '../components/AddLocationModal';
import EditLocationModal from '../components/EditLocationModal';
import { FiEdit2, FiPrinter, FiTrash2 } from 'react-icons/fi';

const TYPE_LABELS = {
  staging: 'Staging',
  rack: 'Rack',
  shelf: 'Shelf',
  bin: 'Bin / Position',
  floor: 'Floor',
  other: 'Other',
};

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/locations');
      setLocations(Array.isArray(data) ? data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const groups = useMemo(() => {
    const grouped = new Map();
    locations.forEach((location) => {
      const group = location.location_type === 'staging'
        ? 'STAGING'
        : location.zone || 'OTHER';
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(location);
    });
    return [...grouped.entries()];
  }, [locations]);

  const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    try {
      await api.delete(`/api/locations/${deletingLocation.id}`);
      setDeletingLocation(null);
      await fetchLocations();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete location.');
      setDeletingLocation(null);
    }
  };

  const printLabel = async (location) => {
    setError('');
    setMessage('');
    try {
      const { data } = await api.post(`/api/locations/${location.id}/print-label`);
      setMessage(data?.message || `Location label ${location.code} sent to printer.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Could not print the location label. Confirm the Zebra printer is configured.',
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Warehouse Locations
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Fixed G8L barcode locations for STAGING, resin racks, shelves, racks and bins.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)}>
          + Add Location
        </Button>
      </div>

      {loading && <p className="text-slate-500">Loading locations…</p>}
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
      {message && <p className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/20 dark:text-emerald-300">{message}</p>}

      {!loading && (
        <div className="space-y-5">
          {groups.map(([group, groupLocations]) => (
            <section key={group} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-900 dark:text-white">{group}</h2>
                <p className="text-xs text-slate-500">{groupLocations.length} fixed location(s)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Rack</th>
                      <th className="px-4 py-3">Shelf</th>
                      <th className="px-4 py-3">Bin</th>
                      <th className="px-4 py-3">Barcode</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupLocations.map((location) => (
                      <tr key={location.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">{location.code}</td>
                        <td className="px-4 py-3">{TYPE_LABELS[location.location_type] || location.location_type}</td>
                        <td className="px-4 py-3">{location.rack || '—'}</td>
                        <td className="px-4 py-3">{location.shelf || '—'}</td>
                        <td className="px-4 py-3">{location.bin_position || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{location.barcode || '—'}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-slate-500">{location.description || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${location.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {location.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" title="Print location label" onClick={() => printLabel(location)}><FiPrinter /></Button>
                            <Button variant="ghost" size="sm" title="Edit" onClick={() => setEditingLocation(location)}><FiEdit2 /></Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={location.is_system ? 'System location cannot be deleted' : 'Delete'}
                              disabled={location.is_system}
                              className="text-rose-600"
                              onClick={() => setDeletingLocation(location)}
                            >
                              <FiTrash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {deletingLocation && (
        <ConfirmModal
          isOpen
          title="Delete Location?"
          message={`Delete ${deletingLocation.code}? Locations with inventory or movement history cannot be deleted.`}
          variant="danger"
          onCancel={() => setDeletingLocation(null)}
          onConfirm={handleDeleteLocation}
        />
      )}
      {isAddModalOpen && (
        <AddLocationModal
          isOpen
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={async () => {
            setIsAddModalOpen(false);
            await fetchLocations();
          }}
        />
      )}
      {editingLocation && (
        <EditLocationModal
          isOpen
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSuccess={async () => {
            setEditingLocation(null);
            await fetchLocations();
          }}
        />
      )}
    </div>
  );
}
