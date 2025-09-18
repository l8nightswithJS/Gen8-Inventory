import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import Button from '../components/ui/Button'; // Import our themed Button
import { FiArrowLeft } from 'react-icons/fi'; // Import a suitable icon

export default function StandaloneScanPage() {
  const navigate = useNavigate();
  const [lastDecoded, setLastDecoded] = useState('');
  const [error, setError] = useState('');

  const handleDecode = useCallback(
    (val) => {
      const text =
        typeof val === 'string'
          ? val
          : String(val?.text ?? val?.rawValue ?? '');
      if (text) setLastDecoded(text);
    },
    [setLastDecoded],
  );

  const handleError = useCallback((err) => {
    const msg = err?.message || String(err) || 'Camera error';
    setError(msg);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            size="sm"
            leftIcon={FiArrowLeft}
          >
            Back
          </Button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
            Standalone Scanner
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto w-full px-4 py-6 grid gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
          <div className="aspect-[3/4] w-full max-w-lg mx-auto overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
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
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 px-3 py-2 text-sm">
                <div className="font-medium text-green-800 dark:text-green-300">
                  Decoded
                </div>
                <div className="text-green-900 dark:text-green-200 break-all">
                  {lastDecoded}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-gray-600 dark:text-slate-400">
                Point the camera at a code to scan.
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setLastDecoded('')}
              variant="secondary"
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/')}
              variant="primary"
            >
              Home
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-500">
          Tip: If the camera doesn’t appear, grant camera permission in your
          browser settings.
        </p>
      </div>
    </div>
  );
}
