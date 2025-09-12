// frontend/src/pages/ClientPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig'; // ✅ correct path from /pages
import QuantityAdjustModal from '../components/QuantityAdjustModal';
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
import UsbScannerInput from '../components/UsbScannerInput';

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
  const [viewMode, setViewMode] = useState('desktop'); // MODIFIED
  const [currentLocation, setCurrentLocation] = useState(null);
  const [adjustingItem, setAdjustingItem] = useState(null);
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
  const [sortConfig, setSortConfig] = useState({
    key: 'part_number',
    direction: 'ascending',
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // ADDED: useEffect to handle responsive viewMode
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('mobile');
      } else {
        setViewMode('desktop');
      }
    };

    handleResize(); // Set initial view mode on load
    window.addEventListener('resize', handleResize); // Add listener for window changes

    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await api.get('/api/items', {
        params: { client_id: clientId },
        meta: { silent: true },
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      // surface auth vs other errors a bit nicer
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError('You’re not authorized to view items for this client.');
      } else {
        setError('Failed to load items.');
      }
    }
  }, [clientId]);

  const fetchClientDetails = useCallback(async () => {
    try {
      // UPDATED: Use clientApi
      const res = await api.get(`/api/clients/${clientId}`);
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

  const handleUsbScan = async (barcode) => {
    try {
      const { data: result } = await api.post('/api/scan', {
        barcode: barcode,
        client_id: clientId,
      });
      if (result && result.type) {
        handleScanSuccess(result);
      }
    } catch (err) {
      const errorMessage =
        err.response?.status === 404
          ? `Barcode "${barcode}" was not found.`
          : err.response?.data?.message || 'An unexpected error occurred.';
      setError(errorMessage);
    }
  };

  const handleScanSuccess = (result) => {
    handleModal('scan', false); // Always close the scanner modal first

    if (result.type === 'location') {
      // If a location is scanned, save it as the active location.
      setCurrentLocation(result.data);
      // Also show the location details modal for user feedback.
      handleModal('scannedLocation', result.data);
    } else if (result.type === 'item') {
      // If an item is scanned, check if we have an active location.
      if (!currentLocation) {
        // If NO location is active, alert the user and open the old item action modal.
        alert(
          'No active location. Please scan a location first to adjust stock.',
        );
        handleModal('scannedItem', result.data);
      } else {
        // If a location IS active, we're ready to adjust stock.
        // Set the 'adjustingItem' state, which we will use to open our new quantity modal.
        setAdjustingItem(result.data);
      }
    }
  };

  const confirmDelete = async () => {
    if (!modalState.deleteItem) return;
    try {
      // UPDATED: Use inventoryApi
      await api.delete(`/api/items/${modalState.deleteItem.id}`);
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
    <div className="mx-auto max-w-7xl px-4">
      {/* MODIFIED: Improved responsive header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-y-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 mb-2 sm:mb-0"
          >
            <FiChevronLeft />
            All Clients
          </button>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {client?.name || 'Loading...'}
          </h1>
        </div>
      </div>

      {/* MODIFIED: Improved responsive action bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        {/* MODIFIED: Wrapped SearchBar and UsbScannerInput in a flex container */}
        <div className="flex-grow flex flex-col sm:flex-row gap-4">
          <SearchBar onSearch={setQuery} />
          <div className="sm:w-64 flex-shrink-0">
            <UsbScannerInput onScan={handleUsbScan} />
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2 justify-start md:justify-end">
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
                href={`${process.env.REACT_APP_API_BASE_URL}/api/items/export?client_id=${clientId}`}
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
          api={api}
        />
      )}
      {modalState.addItem && (
        <AddItemModal
          schema={columns}
          clientId={clientId}
          onClose={() => handleModal('addItem', false)}
          onCreated={fetchItems}
          // UPDATED: Pass the correct API instance to the modal
          api={api}
        />
      )}
      {modalState.editItem && (
        <EditItemModal
          schema={columns}
          item={modalState.editItem}
          onClose={() => handleModal('editItem', null)}
          onUpdated={fetchItems}
          // UPDATED: Pass the correct API instance to the modal
          api={api}
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
      {adjustingItem && currentLocation && (
        <QuantityAdjustModal
          item={adjustingItem}
          location={currentLocation}
          onClose={() => setAdjustingItem(null)}
          onSuccess={() => {
            setAdjustingItem(null);
            fetchItems(); // This refreshes the inventory list after a successful adjustment
          }}
        />
      )}
    </div>
  );
}
