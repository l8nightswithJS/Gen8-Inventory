// src/components/ScanModal.jsx
import { useState } from 'react';
import api from '../utils/axiosConfig';
import BarcodeScannerComponent from './BarcodeScannerComponent';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function ScanModal({ client, onClose, onScanSuccess }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // This function is called when the scanner successfully decodes a barcode
  const handleScanResult = async (barcode) => {
    if (loading) return; // Prevent multiple scans while one is processing

    setLoading(true);
    setError('');

    try {
      const { data: result } = await api.post('/api/scan', {
        barcode: barcode,
        client_id: client.id,
      });

      // Pass the successful, typed result to the parent component
      if (result && result.type) {
        onScanSuccess(result);
        onClose(); // Close the modal on success
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

  const Footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={`Scanning for: ${client.name}`}
      footer={Footer}
    >
      <div className="text-center">
        {loading && <p className="text-blue-600">Processing barcode...</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <div
          className={`rounded-lg overflow-hidden border-4 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <BarcodeScannerComponent onResult={handleScanResult} />
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Point your camera at an item or location barcode.
        </p>
      </div>
    </BaseModal>
  );
}
