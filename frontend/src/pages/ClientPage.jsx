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
import InventoryProfileModal from '../components/InventoryProfileModal';
import ReviewResolutionModal from '../components/ReviewResolutionModal';
import ScanModal from '../components/ScanModal';
import LocationViewModal from '../components/LocationViewModal';
import ItemActionModal from '../components/ItemActionModal';
import UsbScannerInput from '../components/UsbScannerInput';
import {
  FiPlus,
  FiLayers,
  FiDownload,
  FiColumns,
  FiCamera,
  FiChevronLeft,
  FiSettings,
} from 'react-icons/fi';

const DEFAULT_SETTINGS = {
  profile_key: 'general',
  profile_label: 'General Inventory',
  default_uom: null,
  default_location_id: null,
  display_columns: [
    'part_number',
    'name',
    'description',
    'lot_number',
    'inventory_location',
    'total_quantity',
    'uom',
    'status',
  ],
  field_definitions: [],
  import_templates: [],
};

const LEGACY_COLUMN_MAP = {
  Location: 'inventory_location',
  location: 'inventory_location',
  locations: 'inventory_location',
  'On Hand': 'total_quantity',
  on_hand: 'total_quantity',
  'On Hand (Review)': null,
  on_hand_review: null,
};

const normalizeColumns = (columns = []) =>
  Array.from(
    new Set(
      columns
        .map((column) =>
          Object.prototype.hasOwnProperty.call(LEGACY_COLUMN_MAP, column)
            ? LEGACY_COLUMN_MAP[column]
            : column,
        )
        .filter(Boolean),
    ),
  );

export default function ClientPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('role') === 'admin';

  const [client, setClient] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
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
    profile: false,
    scan: false,
    deleteItem: null,
    editItem: null,
    reviewItem: null,
    scannedLocation: null,
    scannedItem: null,
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'part_number',
    direction: 'ascending',
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/api/clients/${clientId}/inventory-settings`,
        { meta: { silent: true } },
      );
      setSettings({ ...DEFAULT_SETTINGS, ...(data || {}) });
      return data;
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          'Failed to load client inventory profile.',
      );
      return null;
    }
  }, [clientId]);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await api.get('/api/items', {
        params: { client_id: clientId },
        meta: { silent: true },
      });
      const nextItems = Array.isArray(data) ? data : data?.items;
      setItems(Array.isArray(nextItems) ? nextItems : []);
      if (!Array.isArray(data) && data?.settings) {
        setSettings((previous) => ({ ...previous, ...data.settings }));
      }
      setError('');
    } catch (requestError) {
      const status = requestError?.response?.status;
      setError(
        status === 401 || status === 403
          ? 'You’re not authorized to view items for this client.'
          : 'Failed to load items.',
      );
    }
  }, [clientId]);

  const fetchClientDetails = useCallback(async () => {
    try {
      const response = await api.get(`/api/clients/${clientId}`);
      setClient(response.data);
    } catch (requestError) {
      console.error('Failed to fetch client details:', requestError);
      navigate('/dashboard');
    }
  }, [clientId, navigate]);

  useEffect(() => {
    fetchClientDetails();
    fetchSettings();
    fetchItems();
  }, [fetchClientDetails, fetchItems, fetchSettings]);

  const handleModal = (modal, value) =>
    setModalState((previous) => ({ ...previous, [modal]: value }));

  const handleUsbScan = async (barcode) => {
    try {
      const { data: result } = await api.post('/api/scan', {
        barcode,
        client_id: clientId,
      });
      if (result?.type) handleScanSuccess(result);
    } catch (requestError) {
      setError(
        requestError.response?.status === 404
          ? `Barcode "${barcode}" was not found.`
          : requestError.response?.data?.message || 'An error occurred.',
      );
    }
  };

  const handleScanSuccess = (result) => {
    handleModal('scan', false);

    if (result.type === 'location') {
      setCurrentLocation(result.data);
      handleModal('scannedLocation', result.data);
      return;
    }

    if (result.type !== 'item') return;

    const scannedItem = result.data;
    if (scannedItem?.review_status === 'needs_review') {
      setAdjustingItem(null);
      if (isAdmin) {
        handleModal('reviewItem', scannedItem);
      } else {
        setError(
          'This item has unresolved imported quantity or location data. An administrator must resolve it before stock can be adjusted.',
        );
      }
      return;
    }

    if (!currentLocation) {
      alert('No active location. Scan a location first to adjust stock.');
      handleModal('scannedItem', scannedItem);
    } else {
      setAdjustingItem(scannedItem);
    }
  };

  const confirmDelete = async () => {
    if (!modalState.deleteItem) return;
    try {
      await api.delete(`/api/items/${modalState.deleteItem.id}`);
      handleModal('deleteItem', null);
      await fetchItems();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to delete item.');
    }
  };

  const saveColumns = async (selectedColumns) => {
    try {
      const normalized = normalizeColumns(selectedColumns);
      const { data } = await api.put(
        `/api/clients/${clientId}/inventory-settings`,
        {
          profile_key: settings.profile_key,
          display_columns: normalized,
          field_definitions: settings.field_definitions,
          default_uom: settings.default_uom,
          default_location_id: settings.default_location_id,
          apply_preset: false,
        },
      );
      setSettings((previous) => ({ ...previous, ...data }));
      handleModal('columnSetup', false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || 'Failed to save shared columns.',
      );
    }
  };

  const filteredItems = useMemo(() => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();

    return items.filter((item) => {
      const reviewValues = Array.isArray(item.review_issues)
        ? item.review_issues.flatMap((issue) => [
            issue.type,
            issue.field,
            issue.source_value,
            issue.message,
          ])
        : [];
      const coreValues = [
        item.part_number,
        item.lot_number,
        item.name,
        item.description,
        item.barcode,
        item.vendor_barcode,
        item.uom,
        item.inventory_location,
        item.status,
        item.priority,
        item.weeks_on_hand,
        ...reviewValues,
      ];
      const attributeValues = Object.values(item.attributes || {});

      return [...coreValues, ...attributeValues].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(lowerQuery),
      );
    });
  }, [items, query]);

  const sortedItems = useMemo(() => {
    const sortableItems = [...filteredItems];
    if (sortConfig.key) {
      sortableItems.sort((first, second) => {
        const firstValue =
          first[sortConfig.key] ?? first.attributes?.[sortConfig.key];
        const secondValue =
          second[sortConfig.key] ?? second.attributes?.[sortConfig.key];

        if (firstValue == null) return 1;
        if (secondValue == null) return -1;
        if (
          typeof firstValue === 'number' &&
          typeof secondValue === 'number'
        ) {
          return firstValue - secondValue;
        }
        return String(firstValue).localeCompare(String(secondValue), undefined, {
          numeric: true,
        });
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
    const sharedColumns = normalizeColumns(settings.display_columns || []);
    return sharedColumns.length > 0
      ? sharedColumns
      : DEFAULT_SETTINGS.display_columns;
  }, [settings.display_columns]);

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-y-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-2"
          >
            <FiChevronLeft /> All Clients
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {client?.name || 'Loading...'}
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {settings.profile_label || settings.profile_key}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-4 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex-grow">
            <SearchBar onSearch={setQuery} />
          </div>
          <div className="flex items-center flex-wrap gap-2 justify-start md:justify-end">
            {viewMode === 'desktop' ? (
              <div className="sm:w-64 flex-shrink-0">
                <UsbScannerInput onScan={handleUsbScan} />
              </div>
            ) : (
              <Button
                onClick={() => handleModal('scan', true)}
                variant="secondary"
                title="Scan"
                leftIcon={FiCamera}
              >
                Scan
              </Button>
            )}

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
                  title="Edit Shared Columns"
                >
                  <FiColumns className="sm:mr-2" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
                <Button
                  onClick={() => handleModal('profile', true)}
                  variant="secondary"
                  title="Inventory Profile"
                >
                  <FiSettings className="sm:mr-2" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="text-red-600 dark:text-red-400 my-3">{error}</p>
        )}

        <InventoryTable
          items={pageItems}
          totalItems={sortedItems.length}
          columns={columns}
          onSort={(key) =>
            setSortConfig((current) =>
              current.key === key && current.direction === 'ascending'
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
          onResolveReview={(item) => handleModal('reviewItem', item)}
          role={isAdmin ? 'admin' : 'viewer'}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(number) => {
            setRowsPerPage(number);
            setPage(1);
          }}
          viewMode={viewMode}
        />
      </div>

      {modalState.columnSetup && (
        <ColumnSetupModal
          isOpen={true}
          onClose={() => handleModal('columnSetup', false)}
          onSave={saveColumns}
          initial={columns}
        />
      )}
      {modalState.profile && (
        <InventoryProfileModal
          clientId={clientId}
          settings={settings}
          onClose={() => handleModal('profile', false)}
          onSaved={async (updatedSettings) => {
            setSettings((previous) => ({ ...previous, ...updatedSettings }));
            await fetchItems();
          }}
        />
      )}
      {modalState.import && (
        <BulkImport
          clientId={clientId}
          settings={settings}
          onClose={() => handleModal('import', false)}
          refresh={fetchItems}
          refreshSettings={fetchSettings}
        />
      )}
      {modalState.addItem && (
        <AddItemModal
          settings={settings}
          clientId={clientId}
          onClose={() => handleModal('addItem', false)}
          onCreated={fetchItems}
        />
      )}
      {modalState.editItem && (
        <EditItemModal
          settings={settings}
          item={modalState.editItem}
          onClose={() => handleModal('editItem', null)}
          onUpdated={fetchItems}
        />
      )}
      {modalState.reviewItem && (
        <ReviewResolutionModal
          item={modalState.reviewItem}
          onClose={() => handleModal('reviewItem', null)}
          onResolved={fetchItems}
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
          onCheckStock={() => {
            alert('Checking stock...');
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
