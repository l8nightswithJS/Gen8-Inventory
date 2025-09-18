import { useCallback, useMemo } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Button from './ui/Button'; // Import the themed Button

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
      const first = Array.isArray(results) ? results[0] : results;
      if (!first) return;

      const text = first?.rawValue || first?.value || first?.text;
      const symbology =
        first?.format || first?.symbology || first?.type || null;

      if (text && onDetected) {
        onDetected(String(text), symbology);
      }
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
          video: { borderRadius: '0.5rem', width: '100%' }, // Standardized border radius
        }}
      />
      {onClose && (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
