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
import ColumnSetupModal from '../components/ColumnSetupModal';
import { getSavedSchema, saveSchema } from '../context/SchemaContext';

// Icons to match Navbar look
import {
  FiSearch,
  FiPlus,
  FiLayers,
  FiDownload,
  FiColumns,
} from 'react-icons/fi';

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
  const [showSchema, setShowSchema] = useState(false);
  const [showSearch, setShowSearch] = useState(false); // toggle search input

  const totalPages = 1;

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/items`, {
        params: { client_id: clientId },
      });
      setItems(data);
      setError('');
      // If there are no items and no saved schema -> prompt to create columns
      const schema = getSavedSchema(clientId);
      if ((!data || data.length === 0) && schema.length === 0 && isAdmin) {
        setShowSchema(true);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load items.');
    }
  }, [clientId, isAdmin]);

  useEffect(() => {
    axios
      .get(`/api/clients/${clientId}`)
      .then((res) => setClient(res.data))
      .catch(() => setClient({ name: '' }));

    fetchItems();
  }, [clientId, fetchItems]);

  const handleUpdated = async () => {
    await new Promise((r) => setTimeout(r, 250));
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

  const q = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const attr = item.attributes || {};
    return ['name', 'part_number'].some((key) =>
      String(attr[key] ?? '')
        .toLowerCase()
        .includes(q),
    );
  });

  // Reusable neutral button to match navbar style
  const BarButton = ({ onClick, children, className = '' }) => (
    <button
      onClick={onClick}
      className={
        'h-10 px-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 ' +
        'flex items-center gap-2 hover:bg-gray-50 hover:text-gray-900 shadow-sm focus:outline-none ' +
        'focus:ring-2 focus:ring-gray-200 ' +
        className
      }
      type="button"
    >
      {children}
    </button>
  );

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Top row: back + actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:underline"
          >
            ← Back
          </button>
        </div>

        {/* Action bar (icon + label, navbar look) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <BarButton onClick={() => setShowSearch((s) => !s)}>
            <FiSearch className="text-lg" />
            <span>Search</span>
          </BarButton>

          {isAdmin && (
            <>
              <BarButton onClick={() => setShowAddItem(true)}>
                <FiPlus className="text-lg" />
                <span>Add</span>
              </BarButton>

              <BarButton onClick={() => setShowImport(true)}>
                <FiLayers className="text-lg" />
                <span>Bulk</span>
              </BarButton>

              <a
                href={`/api/items/export?client_id=${clientId}`}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50 hover:text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <FiDownload className="text-lg" />
                <span>Export</span>
              </a>

              <BarButton
                onClick={() => setShowSchema(true)}
                title="Edit visible columns"
              >
                <FiColumns className="text-lg" />
                <span>Columns</span>
              </BarButton>
            </>
          )}
        </div>
      </div>

      {/* Client title under the controls for a clean top row */}
      <h1 className="text-2xl font-bold mb-2">{client.name}</h1>

      {/* Search bar appears below buttons when toggled */}
      {showSearch && (
        <div className="mt-2">
          <SearchBar onSearch={setQuery} />
        </div>
      )}

      {error && <p className="text-red-600 mt-2">{error}</p>}

      <InventoryTable
        items={filtered}
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        onEdit={setEditItem}
        onDelete={setDeleteItem}
        role={isAdmin ? 'admin' : 'viewer'}
      />

      {showSchema && (
        <ColumnSetupModal
          isOpen={showSchema}
          onClose={() => setShowSchema(false)}
          onSave={(cols) => {
            saveSchema(clientId, cols);
            setShowSchema(false);
          }}
          initial={getSavedSchema(clientId)}
        />
      )}

      {showImport && (
        <BulkImport
          clientId={clientId}
          onClose={() => setShowImport(false)}
          refresh={handleUpdated}
        />
      )}

      {showAddItem && (
        <AddItemModal
          clientId={clientId}
          onClose={() => setShowAddItem(false)}
          onCreated={handleUpdated}
        />
      )}

      {editItem && (
        <EditItemModal
          open={true}
          item={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={handleUpdated}
        />
      )}

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
