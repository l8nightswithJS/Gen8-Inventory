// In frontend/src/pages/MasterInventoryPage.jsx (Final Version)
import { useState, useEffect } from 'react';
import api from '../utils/axiosConfig';
import { FiChevronDown } from 'react-icons/fi';

export default function MasterInventoryPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLocationId, setOpenLocationId] = useState(null);

  useEffect(() => {
    const fetchMasterView = async () => {
      try {
        setLoading(true);
        // This calls the new endpoint we created on the backend
        const { data } = await api.get('/api/inventory/by-location');
        setLocations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load master inventory view:', err);
        setError('Failed to load inventory data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMasterView();
  }, []);

  const toggleLocation = (locationId) => {
    setOpenLocationId((prevId) => (prevId === locationId ? null : locationId));
  };

  if (loading) {
    return <p className="text-center p-8">Loading master inventory...</p>;
  }

  if (error) {
    return <p className="text-center p-8 text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Master Inventory View
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          A complete overview of all stock across all warehouse locations.
        </p>
      </div>

      <div className="space-y-2">
        {locations.map((loc) => (
          <div
            key={loc.location_id}
            className="border rounded-lg bg-white shadow-sm"
          >
            <button
              onClick={() => toggleLocation(loc.location_id)}
              className="w-full flex justify-between items-center p-4 text-left"
            >
              <div className="font-semibold text-lg text-slate-800">
                {loc.location_code}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-slate-500">
                  {loc.items.length} item type(s)
                </span>
                <FiChevronDown
                  className={`transition-transform ${
                    openLocationId === loc.location_id ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {openLocationId === loc.location_id && (
              <div className="border-t p-4">
                {loc.items.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="p-2">Client</th>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loc.items.map((item) => (
                        <tr
                          key={item.item_id}
                          className="border-b last:border-b-0"
                        >
                          <td className="p-2 font-medium text-slate-600">
                            {item.client_name}
                          </td>
                          <td className="p-2">{item.sku || 'N/A'}</td>
                          <td className="p-2 text-slate-500">
                            {item.item_description || 'N/A'}
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-800">
                            {item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-slate-500 py-4">
                    This location is empty.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
