// src/components/ScanModal.jsx
import React, { useMemo, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

function findItemByCode(items, code) {
  if (!code) return null;
  const q = String(code).trim().toLowerCase();
  // Try common keys; extend freely
  const keys = [
    'barcode',
    'qr_code',
    'part_number',
    'lot_number',
    'name',
    'id',
  ];
  for (const item of items) {
    const a = item?.attributes || {};
    for (const k of keys) {
      const val = k === 'id' ? item.id : a[k];
      if (val != null && String(val).trim().toLowerCase() === q) {
        return item;
      }
    }
  }
  return null;
}

export default function ScanModal({
  open,
  clientId,
  items = [],
  onClose,
  onChooseItem,
}) {
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');

  const constraints = useMemo(
    () => ({
      facingMode: 'environment',
      // You can tweak resolution if devices underperform
      // width: { ideal: 1280 }, height: { ideal: 720 },
    }),
    [],
  );

  if (!open) return null;

  const handleDetected = (results) => {
    // results may be array; normalize
    const text = Array.isArray(results)
      ? results[0]?.rawValue
      : results?.[0]?.rawValue;
    const code = text ?? results?.[0] ?? results; // lib returns various shapes
    const str = code ? String(code) : '';
    if (!str) return;

    const match = findItemByCode(items, str);
    if (match) {
      onChooseItem?.(match);
      onClose?.();
    } else {
      setError(`No match for “${str}”. You can try Manual Entry.`);
    }
  };

  const doManual = () => {
    const trimmed = manual.trim();
    if (!trimmed) return;
    const match = findItemByCode(items, trimmed);
    if (match) {
      onChooseItem?.(match);
      onClose?.();
    } else {
      setError(`No match for “${trimmed}”.`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Scan to Locate Item</h2>
          <button
            onClick={onClose}
            className="rounded p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg overflow-hidden border">
            {/* Camera preview + scanning */}
            <Scanner
              components={{
                audio: false,
                finder: true,
              }}
              onScan={handleDetected}
              onError={(e) => setError(e?.message || 'Camera error')}
              constraints={constraints}
              styles={{ container: { width: '100%', height: 320 } }}
            />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Aim your camera at the barcode or QR code. When detected, we’ll
              select the matching item (by <code>barcode</code>,{' '}
              <code>qr_code</code>, <code>part_number</code>,{' '}
              <code>lot_number</code>, <code>name</code>, or <code>id</code>).
            </p>

            <label className="text-sm font-medium">Manual entry</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                className="flex-1 rounded border px-3 py-2"
                placeholder="Type or paste a code…"
              />
              <button
                onClick={doManual}
                className="rounded bg-blue-600 text-white px-3 py-2 hover:bg-blue-700"
              >
                Find
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-auto">
              <p className="text-xs text-gray-500">
                If your device blocks the camera, open site settings and allow
                camera access for this page. Some desktops require an external
                webcam.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button
            onClick={onClose}
            className="rounded border px-3 py-2 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
