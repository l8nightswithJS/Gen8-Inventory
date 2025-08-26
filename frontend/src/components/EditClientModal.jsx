import { useId, useState } from 'react';
import axios from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

// Create a new, separate axios instance specifically for the client service
const clientApi = axios.create({
  baseURL: process.env.REACT_APP_CLIENT_API_URL,
});

// Add the auth token interceptor to every request
clientApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default function EditClientModal({ client, onClose, onUpdated }) {
  const [name, setName] = useState(client.name || '');
  const [logoFile, setLogoFile] = useState(null);
  const [barcode, setBarcode] = useState(client.barcode || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const nameId = useId();
  const barcodeId = useId();
  const logoId = useId();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('barcode', barcode);
      if (logoFile) formData.append('logo', logoFile);

      // UPDATED: Use the new clientApi instance
      const { data } = await clientApi.put(
        `/api/clients/${client.id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      onUpdated?.(data);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update client.');
    } finally {
      setLoading(false);
    }
  };

  const Footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="edit-client-form"
        variant="primary"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={!!client}
      onClose={onClose}
      title={`Edit: ${client.name}`}
      footer={Footer}
    >
      <form
        id="edit-client-form"
        onSubmit={handleSubmit}
        className="p-4 space-y-4"
      >
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div>
          <label
            htmlFor={nameId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Client Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <label
            htmlFor={barcodeId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Barcode (Client)
          </label>
          <input
            id={barcodeId}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <p className="mt-1 text-xs text-gray-500">
            Used by the scanner to jump directly to this client.
          </p>
        </div>
        <div>
          <label
            htmlFor={logoId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Logo (optional)
          </label>
          <input
            id={logoId}
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700"
          />
          {client.logo_url && !logoFile && (
            <img
              src={client.logo_url}
              alt="Current logo"
              className="mt-2 h-16 w-16 object-contain rounded"
            />
          )}
        </div>
      </form>
    </BaseModal>
  );
}
