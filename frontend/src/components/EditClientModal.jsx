import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function EditClientModal({ client, onClose, onUpdated }) {
  const [name, setName] = useState(client.name || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(client.logo_url || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (logoFile) {
        formData.append('logo', logoFile);
      } else {
        formData.append('logo_url', logoUrl);
      }

      const { data } = await axios.put(`/api/clients/${client.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (onUpdated) onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update client.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-black text-lg"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4">Edit Client</h2>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Client Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded"
            required
          />

          <div>
            <label className="block text-sm mb-1">Upload Logo (Image):</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files[0])}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Or Enter Logo URL:</label>
            <input
              type="text"
              placeholder="http://..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
            />
          </div>

          {logoUrl && (
            <div className="mt-2">
              <img
                src={logoUrl}
                alt="Client Logo Preview"
                className="max-h-20 rounded border"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
