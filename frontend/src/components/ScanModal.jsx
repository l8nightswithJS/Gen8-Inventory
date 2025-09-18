import { useState } from 'react';
import api from '../utils/axiosConfig';
import BarcodeScannerComponent from './BarcodeScannerComponent';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function ScanModal({ client, onClose, onScanSuccess }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScanResult = async (barcode) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const { data: result } = await api.post('/api/scan', {
        barcode: barcode,
        client_id: client.id,
      });

      if (result && result.type) {
        onScanSuccess(result);
        onClose();
      } else {
        setError('Received an invalid response from the server.');
      }
    } catch (err) {
      const errorMessage =
        err.response?.status === 404
          ? `Barcode "${barcode}" was not found.`
          : err.response?.data?.message || 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={`Scanning for: ${client.name}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="text-center">
        {loading && (
          <p className="text-blue-600 dark:text-blue-400">
            Processing barcode...
          </p>
        )}
        {error && (
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        )}
        <div
          className={`rounded-lg overflow-hidden border-4 ${
            error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <BarcodeScannerComponent
            onScan={handleScanResult}
            isActive={!loading}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Place a barcode inside the frame to scan it.
        </p>
      </div>
    </BaseModal>
  );
}
