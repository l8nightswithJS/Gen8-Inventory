// src/pages/ClientPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import ScanModal from '../components/ScanModal';
import Button from '../components/ui/Button';

import {
  FiSearch,
  FiPlus,
  FiLayers,
  FiDownload,
  FiColumns,
  FiPrinter,
  FiCamera,
} from 'react-icons/fi';

const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];
const ORDER_HINT = [
  'part_number',
  'description',
  'quantity',
  'reorder_level',
  'reorder_qty',
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
  const [showSchema, setShowSchema] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [schemaRev, setSchemaRev] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [viewMode, setViewMode] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) setViewMode('mobile');
      else if (w < 1024) setViewMode('tablet');
      else setViewMode('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/items`, {
        params: { client_id: clientId },
      });
      const validItems = Array.isArray(data) ? data : [];
      setItems(validItems);
      setError('');
      if (!validItems.length && !getSavedSchema(clientId).length && isAdmin) {
        setShowSchema(true);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setError('Failed to load items.');
    }
  }, [clientId, isAdmin]);

  useEffect(() => {
    axios
      .get(`/api/clients/${clientId}`)
      .then((res) => setClient(res.data || {}))
      .catch(() => setClient({ name: '' }));
    fetchItems();
  }, [clientId, fetchItems]);

  const handleUpdated = () => fetchItems();

  const confirmDelete = async () => {
    if (!deleteItem) return;
    try {
      await axios.delete(`/api/items/${deleteItem.id}`);
      setDeleteItem(null);
      handleUpdated();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete item.');
    }
  };

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const attr = item.attributes || {};
      return ['name', 'part_number', 'description'].some((key) =>
        String(attr[key] ?? '')
          .toLowerCase()
          .includes(q),
      );
    });
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const savedSchema = useMemo(
    () => getSavedSchema(clientId),
    [clientId, schemaRev],
  );

  const columns = useMemo(() => {
    if (savedSchema.length) return savedSchema;
    const union = new Set(
      (items || []).flatMap((it) => Object.keys(it.attributes || {})),
    );
    const hasQty = QTY_KEYS.some((k) => union.has(k));
    const withoutQty = [...union].filter((k) => !QTY_KEYS.includes(k));
    const base = hasQty ? ['quantity', ...withoutQty] : withoutQty;
    return base.sort((a, b) => {
      const ia = ORDER_HINT.indexOf(a),
        ib = ORDER_HINT.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [items, savedSchema]);

  const handlePrintAll = async () => {
    try {
      await axios.post('/api/labels/print/all', {
        client_id: Number(clientId),
      });
      alert('✅ Print job sent successfully.');
    } catch (e) {
      console.error(e);
      alert(
        `❌ Failed to send print job: ${
          e.response?.data?.message || e.message
        }`,
      );
    }
  };

  const Toolbar = ({ isMobile }) => {
    const buttons = (
      <>
        <Button
          onClick={() => setShowSearch((s) => !s)}
          variant="secondary"
          size={isMobile ? 'sm' : 'md'}
          leftIcon={FiSearch}
        >
          Search
        </Button>
        <Button
          onClick={() => setScanOpen(true)}
          variant="secondary"
          size={isMobile ? 'sm' : 'md'}
          leftIcon={FiCamera}
        >
          Scan
        </Button>
        {isAdmin && (
          <>
            <Button
              onClick={() => setShowAddItem(true)}
              variant="secondary"
              size={isMobile ? 'sm' : 'md'}
              leftIcon={FiPlus}
            >
              Add
            </Button>
            <Button
              onClick={() => setShowImport(true)}
              variant="secondary"
              size={isMobile ? 'sm' : 'md'}
              leftIcon={FiLayers}
            >
              Bulk
            </Button>
            <Button
              as="a"
              href={`/api/items/export?client_id=${clientId}`}
              variant="secondary"
              size={isMobile ? 'sm' : 'md'}
              leftIcon={FiDownload}
            >
              Export
            </Button>
            <Button
              onClick={handlePrintAll}
              variant="secondary"
              size={isMobile ? 'sm' : 'md'}
              leftIcon={FiPrinter}
            >
              Print
            </Button>
            <Button
              onClick={() => setShowSchema(true)}
              variant="secondary"
              size={isMobile ? 'sm' : 'md'}
              leftIcon={FiColumns}
            >
              Columns
            </Button>
          </>
        )}
      </>
    );

    if (isMobile) {
      return (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          {buttons}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2 mb-4 justify-start sm:justify-end">
        {buttons}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-blue-600 hover:underline flex-shrink-0"
        >
          ← All Clients
        </button>
        <h1 className="text-3xl font-bold truncate leading-tight">
          {client.name || 'Loading...'}
        </h1>
      </div>

      <Toolbar isMobile={viewMode === 'mobile'} />

      {showSearch && (
        <div className="my-3">
          <SearchBar onSearch={setQuery} />
        </div>
      )}
      {error && <p className="text-red-600 my-3">{error}</p>}

      <InventoryTable
        items={pageItems}
        columns={columns}
        onPage={setPage}
        page={page}
        totalPages={totalPages}
        onEdit={setEditItem}
        onDelete={setDeleteItem}
        role={isAdmin ? 'admin' : 'viewer'}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(n) => {
          setRowsPerPage(n);
          setPage(1);
        }}
        viewMode={viewMode}
      />

      {showSchema && (
        <ColumnSetupModal
          isOpen={showSchema}
          onClose={() => setShowSchema(false)}
          onSave={(cols) => {
            saveSchema(clientId, cols);
            setSchemaRev((n) => n + 1);
          }}
          initial={savedSchema}
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
          item={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={handleUpdated}
        />
      )}
      {deleteItem && (
        <ConfirmModal
          title="Delete Item?"
          message={`Are you sure you want to delete this item? This action cannot be undone.`}
          onCancel={() => setDeleteItem(null)}
          onConfirm={confirmDelete}
        />
      )}
      {scanOpen && (
        <ScanModal
          open={scanOpen}
          clientId={clientId}
          items={items}
          onClose={() => setScanOpen(false)}
          onChooseItem={setEditItem}
        />
      )}
    </div>
  );
}
