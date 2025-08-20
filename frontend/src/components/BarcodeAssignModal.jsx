// src/components/BarcodeAssignModal.jsx
import { useEffect, useId, useState } from 'react';
import {
  assignBarcode,
  listItemBarcodes,
  deleteBarcode,
} from '../utils/barcodesApi';
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
        const rows = await listItemBarcodes(item.id);
        if (isMounted) setList(rows || []);
      } catch (e) {
        console.error('Failed to load item barcodes', e);
        if (isMounted) setMsg('Failed to load existing barcodes.');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const doAssign = async () => {
    if (!scanned.code) return;
    setBusy(true);
    setMsg('');
    try {
      await assignBarcode({
        clientId: item.client_id,
        itemId: item.id,
        barcode: scanned.code,
        symbology: scanned.symbology,
      });
      setMsg('Barcode assigned ✓');
      setScanned({ code: '', symbology: '' });
      const rows = await listItemBarcodes(item.id);
      setList(rows || []);
      onAssigned?.();
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || 'Failed to assign');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (id) => {
    if (
      !window.confirm(
        'Are you sure you want to remove this barcode from the item?',
      )
    )
      return;
    try {
      await deleteBarcode(id);
      setList((prev) => prev.filter((b) => b.id !== id));
      setMsg('Barcode removed ✓');
    } catch (e) {
      setMsg('Failed to remove barcode.');
    }
  };

  const Footer = (
    <Button variant="secondary" onClick={onClose}>
      Done
    </Button>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Barcodes to ${item.attributes?.name || `Item ${item.id}`}`}
      footer={Footer}
    >
      <div className="grid md:grid-cols-2 gap-4">
        {/* Scanner and Assignment Form */}
        <div className="border rounded-lg overflow-hidden">
          <BarcodeScannerComponent
            onDetected={(code, sym) =>
              setScanned({ code, symbology: sym || '' })
            }
          />
          <div className="p-3 border-t bg-gray-50 space-y-2">
            <div>
              <label
                htmlFor={codeId}
                className="block text-xs text-gray-600 mb-1"
              >
                Detected or Manual Entry
              </label>
              <input
                id={codeId}
                className="w-full border rounded px-2 py-1.5 border-gray-300"
                placeholder="Scan or paste code…"
                value={scanned.code}
                onChange={(e) =>
                  setScanned((s) => ({ ...s, code: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label
                  htmlFor={symId}
                  className="block text-xs text-gray-600 mb-1"
                >
                  Symbology (optional)
                </label>
                <input
                  id={symId}
                  className="w-full border rounded px-2 py-1.5 border-gray-300"
                  placeholder="e.g., Code128"
                  value={scanned.symbology}
                  onChange={(e) =>
                    setScanned((s) => ({ ...s, symbology: e.target.value }))
                  }
                />
              </div>
              <Button
                disabled={!scanned.code || busy}
                onClick={doAssign}
                variant="primary"
                size="md"
              >
                {busy ? 'Saving…' : 'Assign'}
              </Button>
            </div>
            {msg && (
              <p className="text-sm pt-1" aria-live="polite">
                {msg}
              </p>
            )}
          </div>
        </div>

        {/* Existing Barcodes List */}
        <div className="border rounded-lg p-3 space-y-2">
          <h3 className="font-semibold text-gray-800">Existing Barcodes</h3>
          {list.length === 0 ? (
            <p className="text-sm text-gray-500">
              No barcodes assigned to this item yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {list.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between border rounded px-2 py-1 bg-white"
                >
                  <div>
                    <div className="font-mono font-medium">{b.barcode}</div>
                    <div className="text-xs text-gray-500">
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
