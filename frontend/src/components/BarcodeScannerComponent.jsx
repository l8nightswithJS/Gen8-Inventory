// frontend/src/components/BarcodeScannerComponent.jsx
import { useCallback, useMemo } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function BarcodeScannerComponent({
  onDetected,
  onClose,
  facingMode = 'environment',
  formats = ['code_128', 'code_39', 'ean_13', 'upc_a', 'qr_code'],
  style = {},
}) {
  const constraints = useMemo(() => ({ facingMode }), [facingMode]);

  const handleScan = useCallback(
    (results) => {
      // library can return multiple results; pick the first meaningful one
      const first = Array.isArray(results) ? results[0] : results;
      const text = first?.rawValue || first?.value || first?.text;
      if (text && onDetected) onDetected(String(text));
    },
    [onDetected],
  );

  const handleError = useCallback((err) => {
    console.error('Scanner error:', err);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Scanner
        onScan={handleScan}
        onError={handleError}
        constraints={constraints}
        allowMultiple={false}
        formats={formats}
        styles={{
          container: { width: '100%', ...style },
          video: { borderRadius: '0.75rem', width: '100%' },
        }}
      />
      {onClose && (
        <div className="flex justify-end">
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
