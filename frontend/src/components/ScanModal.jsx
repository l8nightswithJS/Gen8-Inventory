import { useState } from 'react';
import axios from '../utils/axiosConfig';
import BarcodeScannerComponent from './BarcodeScannerComponent';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

// Create a new, separate axios instance specifically for the barcode service
const barcodeApi = axios.create({
  baseURL: process.env.REACT_APP_BARCODE_API_URL,
});

// Add the auth token interceptor to every request
barcodeApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default function ScanModal({ client, onClose, onScanSuccess }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScanResult = async (barcode) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      // UPDATED: Use the new barcodeApi instance
      const { data: result } = await barcodeApi.post('/api/scan', {
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
          <BarcodeScannerComponent onDetected={handleScanResult} />
        </div>
      </div>
    </BaseModal>
  );
}
