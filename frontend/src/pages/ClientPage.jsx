import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from 'react';
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

import {
  FiSearch,
  FiPlus,
  FiLayers,
  FiDownload,
  FiColumns,
  FiPrinter,
  FiCamera,
} from 'react-icons/fi';

import Button from '../components/ui/Button';

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

// Desktop row-height math
const MIN_ROWS_DESKTOP = 8;
const MAX_ROWS_DESKTOP = 60;

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

  // paging
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [rowsMode, setRowsMode] = useState('auto'); // 'auto' | 'manual'

  // layout
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop'|'tablet'|'mobile'
  const [showSchema, setShowSchema] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [schemaRev, setSchemaRev] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);

  // Refs for measurement
  const anchorRef = useRef(null);
  const filteredRef = useRef([]);

  // ---- viewMode detection
  const computeViewMode = useCallback(() => {
    const w = window.innerWidth || 1280;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }, []);

  useEffect(() => {
    const apply = () => setViewMode(computeViewMode());
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [computeViewMode]);

  // ---- data
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
    axios
      .get(`/api/clients/${clientId}`)
      .then((res) => setClient(res.data || {}))
      .catch(() => setClient({ name: '' }));
    fetchItems();
  }, [clientId, fetchItems]);

  useEffect(() => {
    const picked = sessionStorage.getItem('scan:selectedItemId');
    if (picked && items.length) {
      const found = items.find((it) => String(it.id) === picked);
      if (found) setEditItem(found);
      sessionStorage.removeItem('scan:selectedItemId');
    }
  }, [items]);

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

  // ---- filter
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

  useEffect(() => {
    filteredRef.current = filtered;
  }, [filtered]);

  // ---- desktop auto row math (no page scroll)
  const computeRowsDesktop = useCallback(() => {
    const vpH = window.innerHeight || 900;
    const anchorTop = anchorRef.current?.getBoundingClientRect().top ?? 240;
    const footerH =
      document.querySelector('footer')?.getBoundingClientRect().height ?? 48;
    const theadH =
      document
        .querySelector('.js-inventory-card thead')
        ?.getBoundingClientRect().height ?? 48;
    const pagerH =
      document.querySelector('.js-inventory-pager')?.getBoundingClientRect()
        .height ?? 44;

    const rowEls = Array.from(
      document.querySelectorAll('.js-inventory-card tbody tr'),
    ).slice(0, 3);
    const rowH = rowEls.length
      ? Math.max(
          36,
          Math.round(
            rowEls.reduce((s, tr) => s + tr.getBoundingClientRect().height, 0) /
              rowEls.length,
          ),
        )
      : 44;

    const cardExtras = 20; // borders/padding/margins
    const safety = 12;

    const available =
      vpH - anchorTop - footerH - pagerH - theadH - cardExtras - safety;
    const rows = Math.floor(available / rowH);
    return Math.max(MIN_ROWS_DESKTOP, Math.min(MAX_ROWS_DESKTOP, rows));
  }, []);

  useLayoutEffect(() => {
    const apply = () => {
      if (viewMode === 'desktop' || viewMode === 'tablet') {
        if (rowsMode === 'auto') {
          const next = computeRowsDesktop();
          setRowsPerPage((prev) => (prev !== next ? next : prev));
          setPage((p) => {
            const total = Math.max(
              1,
              Math.ceil((filteredRef.current.length || 0) / next),
            );
            return Math.min(p, total);
          });
          // tiny auto-tune if overflow still appears
          requestAnimationFrame(() => {
            const overflow =
              document.documentElement.scrollHeight - window.innerHeight;
            if (overflow > 0)
              setRowsPerPage((r) => Math.max(MIN_ROWS_DESKTOP, r - 1));
          });
        }
      } else {
        // mobile: use a stable page size (scroll is fine)
        if (rowsMode === 'auto') setRowsPerPage(20);
      }
    };
    apply();

    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(apply, 120);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [computeRowsDesktop, rowsMode, viewMode, showSearch, items.length]);

  // ---- pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  // ---- saved schema (recompute when client or schemaRev changes)
  const savedSchema = useMemo(
    () => getSavedSchema(clientId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, schemaRev],
  );

  // ---- columns (stable order)
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

  // ---- toolbar
  const BarButton = ({
    onClick,
    icon: Icon,
    children,
    className = '',
    as,
    ...rest
  }) => (
    <Button
      as={as || 'button'}
      onClick={onClick}
      size="md"
      variant="outline"
      className={'min-w-[92px] justify-center ' + className}
      leftIcon={Icon}
      {...rest}
    >
      {children}
    </Button>
  );

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

  // compact chip toolbar for mobile
  const MobileChips = () => (
    <div className="flex gap-2 overflow-x-auto pb-1 snap-x -mx-1 px-1">
      <Button
        onClick={() => setShowSearch((s) => !s)}
        variant="outline"
        size="sm"
        className="snap-start"
      >
        🔎 Search
      </Button>
      <Button
        onClick={() => setScanOpen(true)}
        variant="outline"
        size="sm"
        className="snap-start"
      >
        📷 Scan
      </Button>
      {isAdmin && (
        <>
          <Button
            onClick={() => setShowAddItem(true)}
            variant="outline"
            size="sm"
            className="snap-start"
          >
            ＋ Add
          </Button>
          <Button
            onClick={() => setShowImport(true)}
            variant="outline"
            size="sm"
            className="snap-start"
          >
            📥 Bulk
          </Button>
          <Button
            as="a"
            href={`/api/items/export?client_id=${clientId}`}
            variant="outline"
            size="sm"
            className="snap-start"
          >
            ⬇️ Export
          </Button>
          <Button
            onClick={handlePrintAll}
            variant="outline"
            size="sm"
            className="snap-start"
          >
            🖨️ Print
          </Button>
          <Button
            onClick={() => setShowSchema(true)}
            variant="outline"
            size="sm"
            className="snap-start"
          >
            📊 Columns
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col max-w-7xl mx-auto px-4 py-6 pb-20">
      {/* Title + Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">{client.name}</h1>
      </div>

      {viewMode === 'mobile' ? (
        <MobileChips />
      ) : (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:justify-end mb-4">
          <BarButton onClick={() => setShowSearch((s) => !s)} icon={FiSearch}>
            Search
          </BarButton>
          <BarButton onClick={() => setScanOpen(true)} icon={FiCamera}>
            Scan
          </BarButton>
          {isAdmin && (
            <>
              <BarButton onClick={() => setShowAddItem(true)} icon={FiPlus}>
                Add
              </BarButton>
              <BarButton onClick={() => setShowImport(true)} icon={FiLayers}>
                Bulk
              </BarButton>
              <BarButton
                as="a"
                href={`/api/items/export?client_id=${clientId}`}
                icon={FiDownload}
              >
                Export
              </BarButton>
              <BarButton
                onClick={handlePrintAll}
                title="Print all labels"
                icon={FiPrinter}
              >
                Print
              </BarButton>
              <BarButton
                onClick={() => setShowSchema(true)}
                title="Edit visible columns"
                icon={FiColumns}
              >
                Columns
              </BarButton>
            </>
          )}
        </div>
      )}

      {showSearch && (
        <div className="mb-3">
          <SearchBar onSearch={setQuery} />
        </div>
      )}
      {error && <p className="text-red-600 mb-3">{error}</p>}

      {/* Anchor for desktop row calc */}
      <div ref={anchorRef} />

      {/* Table / Cards */}
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
          setRowsMode('manual');
          setRowsPerPage(n);
          setPage(1);
        }}
        isAutoRows={rowsMode === 'auto'}
        onAutoRowsToggle={(auto) => setRowsMode(auto ? 'auto' : 'manual')}
        showRowSelector={viewMode !== 'mobile'}
        viewMode={viewMode}
      />

      {/* Mobile Scan FAB */}
      {viewMode === 'mobile' && (
        <button
          onClick={() => setScanOpen(true)}
          className="fixed right-4 bottom-24 z-40 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white h-14 w-14 text-xl"
          title="Scan"
        >
          📷
        </button>
      )}

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
          open
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
