// src/components/EditClientModal.jsx
import { useId, useState } from 'react';
import axios from '../utils/axiosConfig';

export default function EditClientModal({ client, onClose, onUpdated }) {
  const [name, setName] = useState(client.name || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl] = useState(client.logo_url || '');

  // NEW: client barcode
  const [barcode, setBarcode] = useState(client.barcode || '');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // stable ids for label ↔ input
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
      // include barcode; empty string is allowed (server treats as null)
      formData.append('barcode', barcode);

      if (logoFile) formData.append('logo', logoFile);

      const { data } = await axios.put(`/api/clients/${client.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onUpdated?.(data);
      onClose?.();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to update client.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl"
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4">Edit Client</h2>
        {error && (
          <p className="text-red-600 mb-3 text-sm" aria-live="polite">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Client name */}
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
              placeholder="Acme Bio"
              disabled={loading}
              required
            />
          </div>

          {/* Client barcode */}
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
              placeholder="Scan or paste client barcode"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Used by the scanner to jump directly to this client.
            </p>
          </div>

          {/* Logo upload */}
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
              disabled={loading}
              className="block w-full text-sm text-gray-700"
            />
            {logoUrl && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Current logo"
                  className="max-h-16 object-contain rounded border"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-2xl border hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
