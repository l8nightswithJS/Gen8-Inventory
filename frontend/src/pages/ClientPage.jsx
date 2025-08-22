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
  FiChevronLeft,
} from 'react-icons/fi';

const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];
const ORDER_HINT = [
  'part_number',
  'name',
  'description',
  'on_hand',
  'location',
  'reorder_level',
  'reorder_qty',
  'lead_times',
  'lot_number',
  'barcode',
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
  const [showColumnSetup, setShowColumnSetup] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [schemaRev, setSchemaRev] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);
  const [savedSchema, setSavedSchema] = useState(() =>
    getSavedSchema(clientId),
  );

  const [sortConfig, setSortConfig] = useState({
    key: 'part_number',
    direction: 'ascending',
  });

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [viewMode, setViewMode] = useState('desktop');

  useEffect(() => {
    setSavedSchema(getSavedSchema(clientId));
  }, [clientId, schemaRev]);

  const processedItems = useMemo(() => {
    return items.map((item) => {
      const attrs = item.attributes || {};
      const qtyKey = QTY_KEYS.find((key) => attrs[key] != null);
      const newAttrs = { ...attrs };
      if (qtyKey) {
        newAttrs.on_hand = attrs[qtyKey];
      }
      return { ...item, attributes: newAttrs };
    });
  }, [items]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) setViewMode('mobile');
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
      if (
        validItems.length === 0 &&
        !getSavedSchema(clientId).length &&
        isAdmin
      ) {
        setShowColumnSetup(true);
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

  const handleUpdated = () => {
    fetchItems();
  };

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

  const filteredItems = useMemo(() => {
    if (!query) return processedItems;
    const q = query.trim().toLowerCase();
    return processedItems.filter((item) => {
      const attr = item.attributes || {};
      return ['name', 'part_number', 'description'].some((key) =>
        String(attr[key] ?? '')
          .toLowerCase()
          .includes(q),
      );
    });
  }, [processedItems, query]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a.attributes[sortConfig.key];
        const valB = b.attributes[sortConfig.key];

        if (valA == null) return 1;
        if (valB == null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return valA - valB;
        }
        return String(valA).localeCompare(String(valB));
      });
      if (sortConfig.direction === 'descending') {
        sortableItems.reverse();
      }
    }
    return sortableItems;
  }, [filteredItems, sortConfig]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / rowsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedItems.slice(start, start + rowsPerPage);
  }, [sortedItems, page, rowsPerPage]);

  const columns = useMemo(() => {
    let schema = savedSchema;
    if (!schema.length && items.length > 0) {
      const keysFromData = new Set(
        items.flatMap((it) => Object.keys(it.attributes || {})),
      );
      const nonQtyKeys = [...keysFromData].filter((k) => !QTY_KEYS.includes(k));
      const hasQtyKey = QTY_KEYS.some((k) => keysFromData.has(k));
      let generatedSchema = hasQtyKey ? ['on_hand', ...nonQtyKeys] : nonQtyKeys;
      generatedSchema.sort((a, b) => {
        const hintA = ORDER_HINT.indexOf(a);
        const hintB = ORDER_HINT.indexOf(b);
        if (hintA !== -1 && hintB !== -1) return hintA - hintB;
        if (hintA !== -1) return -1;
        if (hintB !== -1) return 1;
        return a.localeCompare(b);
      });
      schema = generatedSchema;
    }

    let displayColumns = [...schema];
    const hasQtyInSchema = displayColumns.some((k) => QTY_KEYS.includes(k));
    if (hasQtyInSchema) {
      displayColumns = displayColumns.filter((k) => !QTY_KEYS.includes(k));
      if (!displayColumns.includes('on_hand')) {
        displayColumns.push('on_hand');
      }
    }

    const showLotColumn = items.some((item) => item.attributes?.has_lot);
    const lotInSchema = displayColumns.includes('lot_number');
    if (showLotColumn && !lotInSchema) {
      displayColumns.push('lot_number');
    } else if (!showLotColumn && lotInSchema) {
      displayColumns = displayColumns.filter((col) => col !== 'lot_number');
    }

    return displayColumns;
  }, [items, savedSchema]);

  const isLotTrackingSystemActive = useMemo(
    () => items.some((item) => !!item.attributes?.lot_number),
    [items],
  );

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

  const Toolbar = () => (
    <div className="flex flex-wrap items-center gap-2 mb-4 justify-center sm:justify-end">
      <Button
        onClick={() => setShowSearch((s) => !s)}
        variant="secondary"
        title="Search"
      >
        <FiSearch className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Search</span>
      </Button>
      <Button
        onClick={() => setScanOpen(true)}
        variant="secondary"
        title="Scan"
      >
        <FiCamera className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Scan</span>
      </Button>
      {isAdmin && (
        <>
          <Button
            onClick={() => setShowAddItem(true)}
            variant="secondary"
            title="Add Item"
          >
            <FiPlus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add</span>
          </Button>
          <Button
            onClick={() => setShowImport(true)}
            variant="secondary"
            title="Bulk Import"
          >
            <FiLayers className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Bulk</span>
          </Button>
          <Button
            as="a"
            href={`/api/items/export?client_id=${clientId}`}
            variant="secondary"
            title="Export Data"
          >
            <FiDownload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            onClick={handlePrintAll}
            variant="secondary"
            title="Print All Labels"
          >
            <FiPrinter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button
            onClick={() => setShowColumnSetup(true)}
            variant="secondary"
            title="Edit Columns"
          >
            <FiColumns className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Columns</span>
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mb-2"
        >
          <FiChevronLeft className="h-5 w-5 -ml-1" />
          All Clients
        </button>
        {/* Removed 'truncate' class to allow the title to wrap */}
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          {client.name || 'Loading...'}
        </h1>
      </div>

      <Toolbar />

      {showSearch && (
        <div className="my-3">
          <SearchBar onSearch={setQuery} />
        </div>
      )}
      {error && <p className="text-red-600 my-3">{error}</p>}

      <InventoryTable
        items={pageItems}
        totalItems={sortedItems.length}
        columns={columns}
        onSort={handleSort}
        sortConfig={sortConfig}
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

      {showColumnSetup && (
        <ColumnSetupModal
          isOpen={showColumnSetup}
          onClose={() => setShowColumnSetup(false)}
          onSave={(cols) => {
            saveSchema(clientId, cols);
            setSchemaRev((n) => n + 1);
            setShowColumnSetup(false);
          }}
          initial={columns}
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
          schema={columns}
          clientId={clientId}
          onClose={() => setShowAddItem(false)}
          onCreated={handleUpdated}
          isLotTrackingLocked={isLotTrackingSystemActive}
        />
      )}
      {editItem && (
        <EditItemModal
          schema={columns}
          item={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={handleUpdated}
          isLotTrackingLocked={isLotTrackingSystemActive}
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
