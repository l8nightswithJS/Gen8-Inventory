import { useEffect, useId, useState } from 'react';
import api from '../utils/axiosConfig';
import BarcodeScannerComponent from './BarcodeScannerComponent';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function BarcodeAssignModal({
  isOpen,
  onClose,
  item,
  onAssigned,
}) {
  const [scanned, setScanned] = useState({ code: '', symbology: '' });
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const codeId = useId();
  const symId = useId();

  useEffect(() => {
    if (!isOpen || !item?.id) return;
    let isMounted = true;
    (async () => {
      try {
        const { data } = await api.get(`/api/barcodes/items/${item.id}`);
        if (isMounted) setList(data || []);
      } catch (e) {
        console.error('Failed to load item barcodes', e);
        if (isMounted) setMsg('Failed to load existing barcodes.');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isOpen, item?.id]);

  const doSave = async () => {
    setBusy(true);
    setMsg('');
    try {
      const { data } = await api.post('/api/barcodes', {
        item_id: item.id,
        barcode: scanned.code,
        symbology: scanned.symbology,
      });
      setList((prev) => [data, ...prev]);
      setScanned({ code: '', symbology: '' });
      onAssigned?.(data);
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to assign barcode.');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (barcodeId) => {
    if (!window.confirm('Remove this barcode?')) return;
    try {
      await api.delete(`/api/barcodes/${barcodeId}`);
      setList((prev) => prev.filter((b) => b.id !== barcodeId));
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to remove barcode.');
    }
  };

  const inputStyles =
    'w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Barcode: ${item?.name || 'Item'}`}
      size="max-w-4xl"
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Scanner & Form */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg overflow-hidden aspect-video">
            <BarcodeScannerComponent
              onScan={(code, symbology) => setScanned({ code, symbology })}
              isActive={isOpen}
            />
          </div>
          <div className="space-y-3 p-4 border dark:border-slate-700 rounded-lg">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={codeId}
                  className="text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Scanned Code
                </label>
                <input
                  id={codeId}
                  value={scanned.code}
                  readOnly
                  className={`${inputStyles} mt-1`}
                />
              </div>
              <div>
                <label
                  htmlFor={symId}
                  className="text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Symbology
                </label>
                <input
                  id={symId}
                  value={scanned.symbology}
                  readOnly
                  className={`${inputStyles} mt-1`}
                />
              </div>
            </div>
            <div className="text-right">
              <Button onClick={doSave} disabled={busy || !scanned.code}>
                {busy ? 'Saving…' : 'Assign'}
              </Button>
            </div>
            {msg && (
              <p
                className="text-sm pt-1 text-red-600 dark:text-red-400"
                aria-live="polite"
              >
                {msg}
              </p>
            )}
          </div>
        </div>

        {/* Right: Existing Barcodes List */}
        <div className="border dark:border-slate-700 rounded-lg p-3 space-y-2">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Existing Barcodes
          </h3>
          {list.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No barcodes assigned to this item yet.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {list.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                >
                  <div>
                    <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {b.barcode}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {b.symbology || 'N/A'}
                    </div>
                  </div>
                  <button
                    className="text-red-600 text-sm hover:underline font-semibold"
                    onClick={() => doDelete(b.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
