import { useId, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

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

      const { data } = await api.put(`/api/clients/${client.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onUpdated?.(data);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update client.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    'w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <BaseModal
      isOpen={!!client}
      onClose={onClose}
      title="Edit Client Details"
      footer={
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
      }
    >
      <form id="edit-client-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
            {error}
          </p>
        )}
        <div>
          <label
            htmlFor={nameId}
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Client Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputStyles}
            required
          />
        </div>

        <div>
          <label
            htmlFor={barcodeId}
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Barcode (Client)
          </label>
          <input
            id={barcodeId}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className={inputStyles}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Used by the scanner to jump directly to this client.
          </p>
        </div>

        <div>
          <label
            htmlFor={logoId}
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Logo (optional)
          </label>
          <input
            id={logoId}
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
          />
          {client.logo_url && !logoFile && (
            <img
              src={client.logo_url}
              alt="Current logo"
              className="mt-2 h-16 w-16 object-contain rounded-md border border-slate-200 dark:border-slate-700 p-1"
            />
          )}
        </div>
      </form>
    </BaseModal>
  );
}
