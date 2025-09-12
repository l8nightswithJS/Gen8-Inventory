// In frontend/src/pages/LocationsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import Button from '../components/ui/Button';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      // This calls the GET /api/locations endpoint we updated in inventory-service
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

  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Manage Locations
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Add, edit, or remove warehouse locations.
          </p>
        </div>
        <Button variant="secondary">+ Add Location</Button>
      </div>

      {loading && <p className="text-slate-500">Loading locations...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Description
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="border-b last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-800">
                    {loc.code}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {loc.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" title="Edit">
                        <FiEdit2 />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600"
                        title="Delete"
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
    </div>
  );
}
