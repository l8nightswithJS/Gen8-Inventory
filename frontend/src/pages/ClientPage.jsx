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
    const base = process.env.REACT_APP_API || 'http://localhost:8000';
    window.open(`${base}/api/items/export?client_id=${clientId}`, '_blank');
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

        <button
          onClick={exportCSV}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
        >
          Export CSV
        </button>
      </div>

      <InventoryTable
        items={items}
        page={page}
        totalPages={total}
        onPage={(p) => fetchItems(p)}
        refresh={() => fetchItems(page)}
        role={isAdmin ? 'admin' : 'viewer'}
      />

      {isAdmin && (
        <>
          <InventoryForm clientId={clientId} refresh={() => fetchItems(page)} />
          <BulkImport clientId={clientId} refresh={() => fetchItems(page)} />
        </>
      )}

      {items.length === 0 && (
        <p className="text-center text-gray-500 mt-6">
          No inventory items found for this client.
        </p>
      )}
    </div>
  );
}
