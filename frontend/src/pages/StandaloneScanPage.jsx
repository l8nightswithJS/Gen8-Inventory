// frontend/src/pages/StandaloneScanPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function StandaloneScanPage() {
  const navigate = useNavigate();
  const [lastDecoded, setLastDecoded] = useState('');
  const [error, setError] = useState('');

  const handleDecode = useCallback(
    (val) => {
      // val is usually a string; normalize just in case
      const text =
        typeof val === 'string'
          ? val
          : String(val?.text ?? val?.rawValue ?? '');
      if (text) setLastDecoded(text);
      // Optional: auto-navigate (tell me the route if you want this wired)
      // navigate(`/search?q=${encodeURIComponent(text)}`);
    },
    [setLastDecoded],
  );

  const handleError = useCallback((err) => {
    // Camera init can throw transiently; keep it calm
    const msg = err?.message || String(err) || 'Camera error';
    setError(msg);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            <span aria-hidden>←</span>
            Back
          </button>
          <h1 className="text-lg font-semibold">Standalone Scanner</h1>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto w-full px-4 py-6 grid gap-6">
        <div className="rounded-2xl border bg-white shadow-sm p-4">
          <div className="aspect-[3/4] w-full max-w-lg mx-auto overflow-hidden rounded-xl border">
            {/* NOTE: this package exports { Scanner } */}
            <Scanner
              onDecode={handleDecode}
              onError={handleError}
              constraints={{ facingMode: 'environment' }}
              scanDelay={250}
            />
          </div>

          {/* Status */}
          <div className="mt-4 grid gap-2">
            {lastDecoded ? (
              <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm">
                <div className="font-medium text-green-800">Decoded</div>
                <div className="text-green-900 break-all">{lastDecoded}</div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border px-3 py-2 text-sm text-gray-600">
                Point the camera at a code to scan.
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLastDecoded('')}
              className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-2xl bg-black text-white px-3 py-2 text-sm font-medium hover:opacity-90"
            >
              Home
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Tip: If the camera doesn’t appear, grant camera permission in your
          browser settings.
        </p>
      </div>
    </div>
  );
}
