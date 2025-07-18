import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import InventoryTable from '../components/InventoryTable';
import InventoryForm  from '../components/InventoryForm';
import BulkImport     from '../components/BulkImport';
import SearchBar      from '../components/SearchBar';

export default function ClientPage() {
  const { clientId } = useParams();
  const navigate     = useNavigate();
  const isAdmin      = localStorage.getItem('role') === 'admin';

  const [client, setClient]           = useState({});
  const [items, setItems]             = useState([]);
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(1);
  const [query, setQuery]             = useState('');
  const [error, setError]             = useState('');
  const [showAdd, setShowAdd]         = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [showEdit, setShowEdit]       = useState(false);

  // Stable fetchClient
  const fetchClient = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      setClient(data);
    } catch {
      setError('Unable to load client.');
    }
  }, [clientId]);

  // Stable fetchItems
  const fetchItems = useCallback(
    async (p = 1) => {
      try {
        const { data, error: err, count } = await supabase
          .from('items')
          .select('*', { count: 'exact' })
          .eq('client_id', clientId)
          .ilike('name', `%${query}%`)
          .range((p - 1) * 10, p * 10 - 1);
        if (err) throw err;
        setItems(data);
        setTotal(Math.ceil(count / 10));
        setPage(p);
      } catch {
        setError('Unable to load items.');
      }
    },
    [clientId, query]
  );

  // On mount or whenever clientId / query changes:
  useEffect(() => {
    fetchClient();
    fetchItems(1);
  }, [fetchClient, fetchItems]);

  const refreshAndClose = () => {
    fetchItems(page);
    setShowAdd(false);
    setShowImport(false);
    setShowEdit(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 hover:underline mr-4"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-semibold">
          {client.name || 'Loading…'}
        </h2>
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
            fetchItems(1);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              window.open(
                `/api/items/export?client_id=${clientId}`,
                '_blank'
              )
            }
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
          >
            Export CSV
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowAdd(true)}
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
        onPage={fetchItems}
        refresh={() => fetchItems(page)}
        role={isAdmin ? 'admin' : 'viewer'}
        onEdit={(item) => {
          setEditItem(item);
          setShowEdit(true);
        }}
      />

      {items.length === 0 && !error && (
        <p className="text-center text-gray-500 mt-6">
          No inventory items found.
        </p>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md max-w-2xl w-full relative">
            <button
              onClick={() => setShowAdd(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              &times;
            </button>
            <InventoryForm
              clientId={clientId}
              onSuccess={refreshAndClose}
              onClose={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items‑center justify‑center">
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

      {/* Edit Item Modal */}
      {showEdit && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md max-w-2xl w-full relative">
            <button
              onClick={() => setShowEdit(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              &times;
            </button>
            <InventoryForm
              clientId={clientId}
              item={editItem}
              onSuccess={refreshAndClose}
              onClose={() => setShowEdit(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
