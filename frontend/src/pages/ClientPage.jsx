import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';

import InventoryTable from '../components/InventoryTable';
import InventoryForm from '../components/InventoryForm';
import BulkImport from '../components/BulkImport';
import SearchBar from '../components/SearchBar';

export default function ClientPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const isAdmin = localStorage.getItem('role') === 'admin';

  const [client, setClient] = useState({});
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchClient = async () => {
    try {
      const { data } = await axios.get(`/api/clients/${clientId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setClient(data);
    } catch (err) {
      setError('Unable to load client.');
    }
  };

  const fetchItems = async (p = 1, q = query) => {
    try {
      const { data } = await axios.get('/api/items', {
        params: { client_id: clientId, page: p, q },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setItems(data.items);
      setTotal(data.totalPages);
      setPage(p);
    } catch (err) {
      setError('Unable to load items.');
    }
  };

  useEffect(() => {
    fetchClient();
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const exportCSV = () => {
    window.open(`/api/items/export?client_id=${clientId}`, '_blank');
  };

  const refreshAndClose = () => {
    fetchItems(page);
    setShowForm(false);
    setShowImport(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          className="text-blue-600 hover:underline mr-4"
          onClick={() => navigate('/dashboard')}
        >
          ← Back
        </button>
        <h2 className="text-2xl font-semibold">{client.name || 'Loading…'}</h2>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 mb-4 rounded border border-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <SearchBar
          onSearch={(q) => {
            setQuery(q);
            fetchItems(1, q);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
          >
            Export CSV
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                + Add Item
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
              >
                Bulk Import
              </button>
            </>
          )}
        </div>
      </div>

      <InventoryTable
        items={items}
        page={page}
        totalPages={total}
        onPage={(p) => fetchItems(p)}
        refresh={() => fetchItems(page)}
        role={isAdmin ? 'admin' : 'viewer'}
      />

      {items.length === 0 && (
        <p className="text-center text-gray-500 mt-6">
          No inventory items found for this client.
        </p>
      )}

      {/* Add Item Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md max-w-2xl w-full relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              &times;
            </button>
            <InventoryForm clientId={clientId} refresh={refreshAndClose} />
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md max-w-3xl w-full relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowImport(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              &times;
            </button>
            <BulkImport clientId={clientId} refresh={refreshAndClose} />
          </div>
        </div>
      )}
    </div>
  );
}
