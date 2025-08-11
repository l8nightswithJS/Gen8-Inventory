// src/components/BarcodeAssignModal.jsx
import React, { useEffect, useState } from 'react';
import {
  assignBarcode,
  listItemBarcodes,
  deleteBarcode,
} from '../utils/barcodesApi';
import BarcodeScanner from './BarcodeScannerComponent';

/**
 * Props:
 * - isOpen
 * - onClose
 * - item  -> { id, client_id, attributes }
 * - onAssigned? (called after successful assign)
 */
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

  useEffect(() => {
    if (!isOpen || !item?.id) return;
    (async () => {
      try {
        const rows = await listItemBarcodes(item.id);
        setList(rows || []);
      } catch (e) {
        // ignore
      }
    })();
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
      const m = e?.response?.data?.message || e.message || 'Failed to assign';
      setMsg(m);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (id) => {
    if (!window.confirm('Remove this barcode from the item?')) return;
    try {
      await deleteBarcode(id);
      const rows = await listItemBarcodes(item.id);
      setList(rows || []);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">
            Barcodes •{' '}
            {item.attributes?.name ||
              item.attributes?.part_number ||
              `Item ${item.id}`}
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-blue-600 hover:underline"
          >
            Close
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 p-4">
          <div className="border rounded">
            <BarcodeScanner
              onDetected={(code, sym) =>
                setScanned({ code, symbology: sym || '' })
              }
              onClose={onClose}
            />
            <div className="p-3 border-t bg-gray-50">
              <label className="block text-xs text-gray-600 mb-1">
                Detected code
              </label>
              <input
                className="w-full border rounded px-2 py-1"
                placeholder="Scan or paste code…"
                value={scanned.code}
                onChange={(e) =>
                  setScanned((s) => ({ ...s, code: e.target.value }))
                }
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  className="w-full border rounded px-2 py-1"
                  placeholder="Symbology (optional)"
                  value={scanned.symbology}
                  onChange={(e) =>
                    setScanned((s) => ({ ...s, symbology: e.target.value }))
                  }
                />
                <button
                  disabled={!scanned.code || busy}
                  onClick={doAssign}
                  className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Assign'}
                </button>
              </div>
              {msg && <p className="text-sm mt-2">{msg}</p>}
            </div>
          </div>

          <div className="border rounded p-3">
            <h3 className="font-semibold mb-2">Existing barcodes</h3>
            {list.length === 0 ? (
              <p className="text-sm text-gray-500">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between border rounded px-2 py-1"
                  >
                    <div>
                      <div className="font-mono">{b.barcode}</div>
                      <div className="text-xs text-gray-500">
                        {b.symbology || '—'}
                      </div>
                    </div>
                    <button
                      className="text-red-600 text-sm hover:underline"
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
      </div>
    </div>
  );
}
