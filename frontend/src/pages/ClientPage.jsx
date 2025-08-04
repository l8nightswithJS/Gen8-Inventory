// src/pages/ClientPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';

import InventoryTable from '../components/InventoryTable';
import BulkImport from '../components/BulkImport';
import SearchBar from '../components/SearchBar';
import EditItemModal from '../components/EditItemModal';
import AddItemModal from '../components/AddItemModal';
import ConfirmModal from '../components/ConfirmModal';

export default function ClientPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('role') === 'admin';

  const [client, setClient] = useState({});
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [page, setPage] = useState(1);
  const totalPages = 1;

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/items`, {
        params: { client_id: clientId },
      });
      setItems(data);
      console.log('Fetched items:', data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load items.');
    }
  }, [clientId]);

  useEffect(() => {
    axios
      .get(`/api/clients/${clientId}`)
      .then((res) => setClient(res.data))
      .catch(() => setClient({ name: '' }));

    fetchItems();
  }, [clientId, fetchItems]);

  const handleUpdated = async () => {
    await fetchItems();
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/items/${deleteItem.id}`);
      setDeleteItem(null);
      handleUpdated();
    } catch {
      setError('Failed to delete item.');
    }
  };

  const filtered = items.filter((item) => {
    const attr = item.attributes || {};
    const q = query.toLowerCase();
    return (
      attr.name?.toLowerCase().includes(q) ||
      attr.part_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:underline"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold inline ml-4">{client.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBar onSearch={setQuery} />

          {isAdmin && (
            <>
              <button
                onClick={() => setShowAddItem(true)}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
              >
                + Add
              </button>

              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
              >
                Bulk
              </button>

              <a
                href={`/api/items/export?client_id=${clientId}`}
                className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded text-sm font-medium text-center"
              >
                Export
              </a>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-red-600">{error}</p>}

      {/* Table */}
      <InventoryTable
        items={filtered}
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        onEdit={setEditItem}
        onDelete={setDeleteItem}
        role={isAdmin ? 'admin' : 'viewer'}
      />

      {/* Import Modal */}
      {showImport && (
        <BulkImport
          clientId={clientId}
          onClose={() => setShowImport(false)}
          onSuccess={async () => {
            await handleUpdated();
            setShowImport(false);
          }}
        />
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <AddItemModal
          clientId={clientId}
          onClose={() => setShowAddItem(false)}
          onCreated={handleUpdated}
        />
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Confirm Delete */}
      {deleteItem && (
        <ConfirmModal
          title="Delete this item?"
          message={`Are you sure you want to delete “${
            deleteItem.attributes?.name || 'Unnamed'
          }”?`}
          onCancel={() => setDeleteItem(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
