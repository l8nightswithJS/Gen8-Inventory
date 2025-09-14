// frontend/src/pages/ClientPage.jsx (Corrected)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import QuantityAdjustModal from '../components/QuantityAdjustModal';
import InventoryTable from '../components/InventoryTable';
import SearchBar from '../components/SearchBar';
import Button from '../components/ui/Button';
import AddItemModal from '../components/AddItemModal';
import BulkImport from '../components/BulkImport';
import ColumnSetupModal from '../components/ColumnSetupModal';
import ConfirmModal from '../components/ConfirmModal';
import EditItemModal from '../components/EditItemModal';
import ScanModal from '../components/ScanModal';
import LocationViewModal from '../components/LocationViewModal';
import ItemActionModal from '../components/ItemActionModal';
import UsbScannerInput from '../components/UsbScannerInput';
import { getSavedSchema, saveSchema } from '../context/SchemaContext';
import {
  FiPlus,
  FiLayers,
  FiDownload,
  FiColumns,
  FiCamera,
  FiChevronLeft,
} from 'react-icons/fi';

export default function ClientPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('role') === 'admin';

  // --- State Hooks ---
  const [client, setClient] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('desktop');
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

  useEffect(() => {
    const handleResize = () => {
      window.innerWidth < 768 ? setViewMode('mobile') : setViewMode('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
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
      const status = err?.response?.status;
      setError(
        status === 401 || status === 403
          ? 'You’re not authorized to view items for this client.'
          : 'Failed to load items.',
      );
    }
  }, [clientId]);

  const fetchClientDetails = useCallback(async () => {
    try {
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

  const handleModal = (modal, value) =>
    setModalState((prev) => ({ ...prev, [modal]: value }));

  const handleUsbScan = async (barcode) => {
    try {
      const { data: result } = await api.post('/api/scan', {
        barcode,
        client_id: clientId,
      });
      if (result?.type) handleScanSuccess(result);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? `Barcode "${barcode}" was not found.`
          : err.response?.data?.message || 'An error occurred.',
      );
    }
  };

  const handleScanSuccess = (result) => {
    handleModal('scan', false);
    if (result.type === 'location') {
      setCurrentLocation(result.data);
      handleModal('scannedLocation', result.data);
    } else if (result.type === 'item') {
      if (!currentLocation) {
        alert('No active location. Scan a location first to adjust stock.');
        handleModal('scannedItem', result.data);
      } else {
        setAdjustingItem(result.data);
      }
    }
  };

  const confirmDelete = async () => {
    if (!modalState.deleteItem) return;
    try {
      await api.delete(`/api/items/${modalState.deleteItem.id}`);
      handleModal('deleteItem', null);
      fetchItems();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete item.');
    }
  };

  // --- Memoized Calculations ---
  const filteredItems = useMemo(() => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
      const coreValues = [
        item.part_number,
        item.lot_number,
        item.name,
        item.description,
        item.barcode,
      ];
      const attributeValues = Object.values(item.attributes || {});
      return [...coreValues, ...attributeValues].some((val) =>
        String(val).toLowerCase().includes(lowerQuery),
      );
    });
  }, [items, query]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key] ?? a.attributes?.[sortConfig.key];
        const valB = b[sortConfig.key] ?? b.attributes?.[sortConfig.key];
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
    if (items.length === 0)
      return [
        'part_number',
        'name',
        'description',
        'lot_number',
        'barcode',
        'total_quantity',
      ];

    // ✅ MODIFIED: The default set of columns now includes all important core fields.
    const defaultCoreFields = [
      'part_number',
      'name',
      'description',
      'lot_number',
      'barcode',
      'total_quantity',
    ];
    const keys = new Set(defaultCoreFields);

    // Add any extra custom fields from the attributes blob
    items.forEach((it) =>
      Object.keys(it.attributes || {}).forEach((key) => keys.add(key)),
    );

    return Array.from(keys);
  }, [items, schema]);

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-y-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 mb-2 sm:mb-0"
          >
            <FiChevronLeft /> All Clients
          </button>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {client?.name || 'Loading...'}
          </h1>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
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
        />
      )}
      {modalState.addItem && (
        <AddItemModal
          schema={columns}
          clientId={clientId}
          onClose={() => handleModal('addItem', false)}
          onCreated={fetchItems}
        />
      )}
      {modalState.editItem && (
        <EditItemModal
          schema={columns}
          item={modalState.editItem}
          onClose={() => handleModal('editItem', null)}
          onUpdated={fetchItems}
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
          onCheckStock={(_item) => {
            alert(`Checking stock...`);
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
            fetchItems();
          }}
        />
      )}
    </div>
  );
}
