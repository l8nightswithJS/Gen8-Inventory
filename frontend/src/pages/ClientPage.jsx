import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/axiosConfig';
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
import UsbScannerInput from '../components/UsbScannerInput';
import TransferInventoryModal from '../components/TransferInventoryModal';
import RemainingQuantityModal from '../components/RemainingQuantityModal';
import MovementHistoryModal from '../components/MovementHistoryModal';
import RepackContainerModal from '../components/RepackContainerModal';
import QualityStatusModal from '../components/QualityStatusModal';
import {
  FiCamera,
  FiChevronLeft,
  FiColumns,
  FiDownload,
  FiLayers,
  FiMapPin,
  FiPlus,
  FiSettings,
  FiX,
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
    'container_status',
    'quality_status',
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
  const [modalState, setModalState] = useState({
    addItem: false,
    import: false,
    columnSetup: false,
    profile: false,
    scan: false,
    deleteItem: null,
    editItem: null,
    reviewItem: null,
    transferItem: null,
    remainingItem: null,
    historyItem: null,
    repackItem: null,
    qualityItem: null,
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'part_number',
    direction: 'ascending',
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    const handleResize = () => setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop');
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

  const handleModal = (key, value) =>
    setModalState((previous) => ({ ...previous, [key]: value }));

  const openScannedItem = (scannedItem) => {
    if (scannedItem?.review_status === 'needs_review') {
      if (isAdmin) handleModal('reviewItem', scannedItem);
      else setError('This container needs inventory review before warehouse operations.');
      return;
    }

    const qualityStatus = scannedItem?.quality_status || 'released';
    if (!currentLocation && qualityStatus !== 'released') {
      handleModal('qualityItem', scannedItem);
      return;
    }

    if (
      currentLocation &&
      qualityStatus !== 'released' &&
      !['RECEIVING-QC', 'COMPONENTS-HOLD', 'QUARANTINE'].includes(
        String(currentLocation.code || '').toUpperCase(),
      )
    ) {
      setError(
        `${scannedItem.barcode || 'This container'} is ${qualityStatus.replace(/_/g, ' ')}. Release it before put-away to a production/storage shelf.`,
      );
      handleModal('qualityItem', scannedItem);
      return;
    }

    if (!currentLocation) {
      handleModal('remainingItem', scannedItem);
      return;
    }

    const atDestination = (scannedItem.inventory_levels || []).some(
      (balance) =>
        Number(balance.location_id) === Number(currentLocation.id) &&
        Number(balance.quantity) > 0,
    );

    if (atDestination) {
      handleModal('remainingItem', scannedItem);
    } else {
      handleModal('transferItem', scannedItem);
    }
  };

  const handleScanSuccess = (result) => {
    handleModal('scan', false);
    setError('');

    if (result.type === 'location') {
      setCurrentLocation(result.data);
      return;
    }
    if (result.type === 'item') openScannedItem(result.data);
  };

  const handleUsbScan = async (barcode) => {
    try {
      const { data } = await api.post('/api/scan', {
        barcode,
        client_id: clientId,
      });
      handleScanSuccess(data);
    } catch (requestError) {
      setError(
        requestError?.response?.status === 404
          ? `Barcode "${barcode}" was not found.`
          : requestError?.response?.data?.message || 'Scan failed.',
      );
    }
  };

  const confirmArchive = async () => {
    if (!modalState.deleteItem) return;
    try {
      await api.delete(`/api/items/${modalState.deleteItem.id}`);
      handleModal('deleteItem', null);
      await fetchItems();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || 'Failed to archive container.',
      );
      handleModal('deleteItem', null);
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
    const needle = query.toLowerCase();
    return items.filter((item) => {
      const values = [
        item.part_number,
        item.lot_number,
        item.name,
        item.description,
        item.barcode,
        item.vendor_barcode,
        item.uom,
        item.inventory_location,
        item.status,
        item.container_status,
        item.quality_status,
        item.priority,
        ...Object.values(item.attributes || {}),
      ];
      return values.some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [items, query]);

  const sortedItems = useMemo(() => {
    const result = [...filteredItems];
    if (!sortConfig.key) return result;
    result.sort((a, b) => {
      const av = a[sortConfig.key] ?? a.attributes?.[sortConfig.key];
      const bv = b[sortConfig.key] ?? b.attributes?.[sortConfig.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    });
    if (sortConfig.direction === 'descending') result.reverse();
    return result;
  }, [filteredItems, sortConfig]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedItems.slice(start, start + rowsPerPage);
  }, [sortedItems, page, rowsPerPage]);

  const columns = useMemo(() => {
    const shared = normalizeColumns(settings.display_columns || []);
    return shared.length ? shared : DEFAULT_SETTINGS.display_columns;
  }, [settings.display_columns]);

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          <FiChevronLeft /> All Clients
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {client?.name || 'Loading...'}
          </h1>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {settings.profile_label || settings.profile_key}
          </span>
        </div>
      </div>

      {currentLocation && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-500/40 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <FiMapPin className="text-blue-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-blue-600">Active scan destination</p>
              <p className="font-bold text-blue-900 dark:text-blue-200">
                {currentLocation.code}
                {currentLocation.description ? ` — ${currentLocation.description}` : ''}
              </p>
              <p className="font-mono text-xs text-blue-700 dark:text-blue-300">
                {currentLocation.barcode || currentLocation.code}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentLocation(null)}
            className="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-900/30"
            title="End this destination scan session"
          >
            <FiX /> Clear Location
          </button>
        </div>
      )}

      <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-grow"><SearchBar onSearch={setQuery} /></div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {viewMode === 'desktop' ? (
              <div className="w-64 flex-shrink-0"><UsbScannerInput onScan={handleUsbScan} /></div>
            ) : (
              <Button onClick={() => handleModal('scan', true)} variant="secondary" leftIcon={FiCamera}>Scan</Button>
            )}

            {isAdmin && (
              <>
                <Button onClick={() => handleModal('addItem', true)} variant="secondary"><FiPlus className="sm:mr-2" /><span className="hidden sm:inline">Add</span></Button>
                <Button onClick={() => handleModal('import', true)} variant="secondary"><FiLayers className="sm:mr-2" /><span className="hidden sm:inline">Bulk</span></Button>
                <Button as="a" href={`${process.env.REACT_APP_API_BASE_URL}/api/items/export?client_id=${clientId}`} variant="secondary"><FiDownload className="sm:mr-2" /><span className="hidden sm:inline">Export</span></Button>
                <Button onClick={() => handleModal('columnSetup', true)} variant="secondary"><FiColumns className="sm:mr-2" /><span className="hidden sm:inline">Columns</span></Button>
                <Button onClick={() => handleModal('profile', true)} variant="secondary"><FiSettings className="sm:mr-2" /><span className="hidden sm:inline">Profile</span></Button>
              </>
            )}
          </div>
        </div>

        {error && <p className="my-3 text-red-600 dark:text-red-400">{error}</p>}

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
          onRemaining={(item) => handleModal('remainingItem', item)}
          onHistory={(item) => handleModal('historyItem', item)}
          onRepack={(item) => handleModal('repackItem', item)}
          onQuality={(item) => handleModal('qualityItem', item)}
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
          isOpen
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
          onSaved={async (updated) => {
            setSettings((previous) => ({ ...previous, ...updated }));
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
          clientId={clientId}
          settings={settings}
          onClose={() => handleModal('addItem', false)}
          onCreated={fetchItems}
        />
      )}
      {modalState.editItem && (
        <EditItemModal
          item={modalState.editItem}
          settings={settings}
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
      {modalState.transferItem && currentLocation && (
        <TransferInventoryModal
          item={modalState.transferItem}
          destination={currentLocation}
          onClose={() => handleModal('transferItem', null)}
          onTransferred={fetchItems}
          onRepack={(item) => {
            handleModal('transferItem', null);
            handleModal('repackItem', item);
          }}
        />
      )}
      {modalState.remainingItem && (
        <RemainingQuantityModal
          item={modalState.remainingItem}
          preferredLocation={currentLocation}
          onClose={() => handleModal('remainingItem', null)}
          onUpdated={fetchItems}
        />
      )}
      {modalState.repackItem && (
        <RepackContainerModal
          item={modalState.repackItem}
          onClose={() => handleModal('repackItem', null)}
          onRepacked={fetchItems}
        />
      )}
      {modalState.qualityItem && (
        <QualityStatusModal
          item={modalState.qualityItem}
          onClose={() => handleModal('qualityItem', null)}
          onUpdated={fetchItems}
        />
      )}
      {modalState.historyItem && (
        <MovementHistoryModal
          item={modalState.historyItem}
          onClose={() => handleModal('historyItem', null)}
        />
      )}
      {modalState.deleteItem && (
        <ConfirmModal
          isOpen
          title="Archive Container?"
          message="This keeps the barcode and movement history, but removes the empty container from active inventory. Containers with stock cannot be archived."
          onCancel={() => handleModal('deleteItem', null)}
          onConfirm={confirmArchive}
        />
      )}
      {modalState.scan && client && (
        <ScanModal
          client={client}
          onClose={() => handleModal('scan', false)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
}
