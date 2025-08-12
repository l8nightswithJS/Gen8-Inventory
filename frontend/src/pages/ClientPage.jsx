// src/pages/ClientPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

import ScanButton from '../components/ScanButton';
import ScanModal from '../components/ScanModal';

import {
  FiSearch,
  FiPlus,
  FiLayers,
  FiDownload,
  FiColumns,
  FiPrinter, // ⬅️ NEW
} from 'react-icons/fi';

const PAGE_SIZE = 20;
const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];
const ORDER_HINT = [
  'part_number',
  'description',
  'quantity',
  'reorder_level',
  'reorder_qty',
  'lead_times',
  'type',
  'name',
  'location',
];

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
  const [showSearch, setShowSearch] = useState(false);
  const [schemaRev, setSchemaRev] = useState(0);

  // Scan modal state
  const [scanOpen, setScanOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/items`, {
        params: { client_id: clientId },
      });
      setItems(Array.isArray(data) ? data : []);
      setError('');
      const schema = getSavedSchema(clientId);
      if ((!data || data.length === 0) && schema.length === 0 && isAdmin) {
        setShowSchema(true);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setError('Failed to load items.');
    }
  }, [clientId, isAdmin]);

  useEffect(() => {
    const picked = sessionStorage.getItem('scan:selectedItemId');
    if (picked && items.length) {
      const found = items.find((it) => String(it.id) === picked);
      if (found) setEditItem(found);
      sessionStorage.removeItem('scan:selectedItemId');
    }
  }, [items]);

  useEffect(() => {
    axios
      .get(`/api/clients/${clientId}`)
      .then((res) => setClient(res.data || {}))
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

  // Filter
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((item) => {
      const attr = item.attributes || {};
      return ['name', 'part_number'].some((key) =>
        String(attr[key] ?? '')
          .toLowerCase()
          .includes(q),
      );
    });
  }, [items, q]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Stable column list (saved schema > inferred union)
  const columns = useMemo(() => {
    const saved = getSavedSchema(clientId);
    if (saved.length) return saved;

    const union = new Set(
      (items || []).flatMap((it) => Object.keys(it.attributes || {})),
    );

    const hasQty = QTY_KEYS.some((k) => union.has(k));
    const withoutQty = [...union].filter((k) => !QTY_KEYS.includes(k));
    const base = hasQty ? ['quantity', ...withoutQty] : withoutQty;

    return base.sort((a, b) => {
      const ia = ORDER_HINT.indexOf(a);
      const ib = ORDER_HINT.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [clientId, items, schemaRev]);

  const BarButton = ({ onClick, children, className = '', ...rest }) => (
    <button
      onClick={onClick}
      type="button"
      className={
        'h-10 px-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 ' +
        'flex items-center gap-2 hover:bg-gray-50 hover:text-gray-900 shadow-sm focus:outline-none ' +
        'focus:ring-2 focus:ring-gray-200 ' +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );

  const handleScanChoose = (item) => setEditItem(item);

  // === NEW: Print All Labels via BarTender ===
  const handlePrintAll = async () => {
    try {
      await axios.post('/api/labels/print/all', {
        client_id: Number(clientId),
      });
      alert('✅ Sent all labels to BarTender.');
    } catch (e) {
      console.error(e);
      alert('❌ Failed to send labels to BarTender.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:underline"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">{client.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <BarButton onClick={() => setShowSearch((s) => !s)}>
            <FiSearch className="text-lg" />
            <span>Search</span>
          </BarButton>

          {/* Scan for all roles */}
          <ScanButton onClick={() => setScanOpen(true)} />

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

              {/* NEW: Print All */}
              <BarButton
                onClick={handlePrintAll}
                title="Print all labels for this client"
              >
                <FiPrinter className="text-lg" />
                <span>Print</span>
              </BarButton>

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

      {showSearch && (
        <div className="mb-3">
          <SearchBar onSearch={setQuery} />
        </div>
      )}

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="flex-1 min-h-0">
        <InventoryTable
          items={pageItems}
          columns={columns}
          onPage={setPage}
          page={page}
          totalPages={totalPages}
          onEdit={setEditItem}
          onDelete={setDeleteItem}
          role={isAdmin ? 'admin' : 'viewer'}
        />
      </div>

      {/* Modals */}
      {showSchema && (
        <ColumnSetupModal
          isOpen={showSchema}
          onClose={() => setShowSchema(false)}
          onSave={(cols) => {
            saveSchema(clientId, cols);
            setSchemaRev((n) => n + 1);
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

      <ScanModal
        open={scanOpen}
        clientId={clientId}
        items={items}
        onClose={() => setScanOpen(false)}
        onChooseItem={(it) => setEditItem(it)}
      />
    </div>
  );
}
