import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig'; // We'll use this to create other instances

// --- Main Components ---
import InventoryTable from '../components/InventoryTable';
import SearchBar from '../components/SearchBar';
import Button from '../components/ui/Button';

// --- Modal Components ---
import AddItemModal from '../components/AddItemModal';
import BulkImport from '../components/BulkImport';
import ColumnSetupModal from '../components/ColumnSetupModal';
import ConfirmModal from '../components/ConfirmModal';
import EditItemModal from '../components/EditItemModal';
import ScanModal from '../components/ScanModal';
import LocationViewModal from '../components/LocationViewModal';
import ItemActionModal from '../components/ItemActionModal';

// --- Helpers & Context ---
import { getSavedSchema, saveSchema } from '../context/SchemaContext';
import {
  FiPlus,
  FiLayers,
  FiDownload,
  FiColumns,
  FiCamera,
  FiChevronLeft,
} from 'react-icons/fi';

// --- Create dedicated API clients for our new services ---
const inventoryApi = axios.create({
  baseURL: process.env.REACT_APP_INVENTORY_API_URL,
});
const clientApi = axios.create({
  baseURL: process.env.REACT_APP_CLIENT_API_URL,
});

// Add the auth token to every request for these new instances
[inventoryApi, clientApi].forEach((apiInstance) => {
  apiInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );
});
// -----------------------------------------------------------

const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];

export default function ClientPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('role') === 'admin';

  // --- State Hooks ---
  const [client, setClient] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [viewMode] = useState('desktop');

  // --- Modal State ---
  const [modalState, setModalState] = useState({
    addItem: false,
    import: false,
    columnSetup: false,
    scan: false,
    deleteItem: null,
    editItem: null,
    scannedLocation: null,
    scannedItem: null,
  });

  const [schema, setSchema] = useState(() => getSavedSchema(clientId));

  // --- Sorting & Pagination State ---
  const [sortConfig, setSortConfig] = useState({
    key: 'part_number',
    direction: 'ascending',
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const fetchItems = useCallback(async () => {
    try {
      // UPDATED: Use inventoryApi
      const { data } = await inventoryApi.get(`/api/items`, {
        params: { client_id: clientId },
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load items.');
    }
  }, [clientId]);

  const fetchClientDetails = useCallback(async () => {
    try {
      // UPDATED: Use clientApi
      const res = await clientApi.get(`/api/clients/${clientId}`);
      setClient(res.data);
    } catch (err) {
      console.error('Failed to fetch client details:', err);
      navigate('/dashboard');
    }
  }, [clientId, navigate]);

  useEffect(() => {
    fetchClientDetails();
    fetchItems();
  }, [clientId, fetchItems, fetchClientDetails]);

  const handleModal = (modal, value) => {
    setModalState((prev) => ({ ...prev, [modal]: value }));
  };

  const handleScanSuccess = (result) => {
    handleModal('scan', false);
    if (result.type === 'location') {
      handleModal('scannedLocation', result.data);
    } else if (result.type === 'item') {
      handleModal('scannedItem', result.data);
    }
  };

  const confirmDelete = async () => {
    if (!modalState.deleteItem) return;
    try {
      // UPDATED: Use inventoryApi
      await inventoryApi.delete(`/api/items/${modalState.deleteItem.id}`);
      handleModal('deleteItem', null);
      fetchItems();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete item.');
    }
  };

  // --- Memoized Calculations (No changes needed here) ---
  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter((item) =>
      Object.values(item.attributes).some((val) =>
        String(val).toLowerCase().includes(query.toLowerCase()),
      ),
    );
  }, [items, query]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a.attributes[sortConfig.key];
        const valB = b.attributes[sortConfig.key];
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number')
          return valA - valB;
        return String(valA).localeCompare(String(valB));
      });
      if (sortConfig.direction === 'descending') sortableItems.reverse();
    }
    return sortableItems;
  }, [filteredItems, sortConfig]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedItems.slice(start, start + rowsPerPage);
  }, [sortedItems, page, rowsPerPage]);

  const columns = useMemo(() => {
    if (schema.length > 0) return schema;
    if (items.length === 0) return [];
    const keys = new Set(
      items.flatMap((it) => Object.keys(it.attributes || {})),
    );
    return Array.from(keys).filter((k) => !QTY_KEYS.includes(k));
  }, [items, schema]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <FiChevronLeft />
          All Clients
        </button>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          {client?.name || 'Loading...'}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 justify-end">
        <SearchBar onSearch={setQuery} />
        <Button
          onClick={() => handleModal('scan', true)}
          variant="secondary"
          title="Scan"
        >
          <FiCamera className="sm:mr-2" />
          <span className="hidden sm:inline">Scan</span>
        </Button>
        {isAdmin && (
          <>
            <Button
              onClick={() => handleModal('addItem', true)}
              variant="secondary"
              title="Add Item"
            >
              <FiPlus className="sm:mr-2" />
              <span className="hidden sm:inline">Add</span>
            </Button>
            <Button
              onClick={() => handleModal('import', true)}
              variant="secondary"
              title="Bulk Import"
            >
              <FiLayers className="sm:mr-2" />
              <span className="hidden sm:inline">Bulk</span>
            </Button>
            <Button
              as="a"
              // UPDATED: Use full URL for export
              href={`${process.env.REACT_APP_INVENTORY_API_URL}/api/items/export?client_id=${clientId}`}
              variant="secondary"
              title="Export Data"
            >
              <FiDownload className="sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              onClick={() => handleModal('columnSetup', true)}
              variant="secondary"
              title="Edit Columns"
            >
              <FiColumns className="sm:mr-2" />
              <span className="hidden sm:inline">Columns</span>
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-red-600 my-3">{error}</p>}

      <InventoryTable
        items={pageItems}
        totalItems={sortedItems.length}
        columns={columns}
        onSort={(key) =>
          setSortConfig((sc) =>
            sc.key === key && sc.direction === 'ascending'
              ? { key, direction: 'descending' }
              : { key, direction: 'ascending' },
          )
        }
        sortConfig={sortConfig}
        onPage={setPage}
        page={page}
        totalPages={Math.max(1, Math.ceil(sortedItems.length / rowsPerPage))}
        onEdit={(item) => handleModal('editItem', item)}
        onDelete={(item) => handleModal('deleteItem', item)}
        role={isAdmin ? 'admin' : 'viewer'}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(n) => {
          setRowsPerPage(n);
          setPage(1);
        }}
        viewMode={viewMode}
      />

      {/* --- Modals --- */}
      {modalState.columnSetup && (
        <ColumnSetupModal
          isOpen={true}
          onClose={() => handleModal('columnSetup', false)}
          onSave={(cols) => {
            const newSchema = saveSchema(clientId, cols);
            setSchema(newSchema);
            handleModal('columnSetup', false);
          }}
          initial={columns}
        />
      )}
      {modalState.import && (
        <BulkImport
          clientId={clientId}
          onClose={() => handleModal('import', false)}
          refresh={fetchItems}
          // UPDATED: Pass the correct API instance to the modal
          api={inventoryApi}
        />
      )}
      {modalState.addItem && (
        <AddItemModal
          schema={columns}
          clientId={clientId}
          onClose={() => handleModal('addItem', false)}
          onCreated={fetchItems}
          // UPDATED: Pass the correct API instance to the modal
          api={inventoryApi}
        />
      )}
      {modalState.editItem && (
        <EditItemModal
          schema={columns}
          item={modalState.editItem}
          onClose={() => handleModal('editItem', null)}
          onUpdated={fetchItems}
          // UPDATED: Pass the correct API instance to the modal
          api={inventoryApi}
        />
      )}
      {modalState.deleteItem && (
        <ConfirmModal
          title="Delete Item?"
          message="Are you sure you want to delete this item?"
          onCancel={() => handleModal('deleteItem', null)}
          onConfirm={confirmDelete}
        />
      )}

      {modalState.scan && client && (
        <ScanModal
          client={client}
          onClose={() => handleModal('scan', false)}
          onScanSuccess={handleScanSuccess}
        />
      )}
      {modalState.scannedLocation && (
        <LocationViewModal
          location={modalState.scannedLocation}
          onClose={() => handleModal('scannedLocation', null)}
        />
      )}
      {modalState.scannedItem && (
        <ItemActionModal
          item={modalState.scannedItem}
          onClose={() => handleModal('scannedItem', null)}
          onEditDetails={(item) => {
            handleModal('scannedItem', null);
            handleModal('editItem', item);
          }}
          onCheckStock={(item) => {
            alert(
              `Checking stock for ${item.attributes.name}... (Feature coming soon)`,
            );
            handleModal('scannedItem', null);
          }}
        />
      )}
    </div>
  );
}
