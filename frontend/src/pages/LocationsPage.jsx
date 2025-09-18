import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ConfirmModal';
import AddLocationModal from '../components/AddLocationModal';
import EditLocationModal from '../components/EditLocationModal';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/locations');
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load locations:', err);
      setError('Failed to load locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    try {
      await api.delete(`/api/locations/${deletingLocation.id}`);
      setDeletingLocation(null);
      fetchLocations();
    } catch (err) {
      console.error('Failed to delete location:', err);
      setError(err.response?.data?.message || 'Failed to delete location.');
      setDeletingLocation(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Manage Locations
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Add, edit, or remove warehouse locations.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)}>
          + Add Location
        </Button>
      </div>

      {loading && (
        <p className="text-slate-500 dark:text-slate-400">
          Loading locations...
        </p>
      )}
      {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 shadow-md rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  Description
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {loc.code}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {loc.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Edit"
                        onClick={() => setEditingLocation(loc)}
                      >
                        <FiEdit2 />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-500"
                        title="Delete"
                        onClick={() => setDeletingLocation(loc)}
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
      )}

      {deletingLocation && (
        <ConfirmModal
          isOpen={true}
          title="Delete Location?"
          message={`Are you sure you want to delete the location "${deletingLocation.code}"? This cannot be undone.`}
          variant="danger"
          onCancel={() => setDeletingLocation(null)}
          onConfirm={handleDeleteLocation}
        />
      )}

      {isAddModalOpen && (
        <AddLocationModal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchLocations();
          }}
        />
      )}

      {editingLocation && (
        <EditLocationModal
          isOpen={true}
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSuccess={() => {
            setEditingLocation(null);
            fetchLocations();
          }}
        />
      )}
    </div>
  );
}
