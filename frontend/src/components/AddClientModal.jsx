import { useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

function AddClientForm({ onSuccess, onCancel }) {
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Client name is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await api.post('/api/clients/add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess?.(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error adding client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
          {error}
        </p>
      )}
      <div>
        <label
          htmlFor="clientName"
          className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Client Name
        </label>
        <input
          id="clientName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label
          htmlFor="logoFile"
          className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Logo (Optional)
        </label>
        <input
          id="logoFile"
          type="file"
          accept="image/*"
          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-700 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
          disabled={loading}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : 'Add Client'}
        </Button>
      </div>
    </form>
  );
}

export default function AddClientModal({ isOpen, onClose, onClientAdded }) {
  const handleSuccess = (client) => {
    onClientAdded?.(client);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Client">
      {/* The form already has padding, so we remove it from the direct child */}
      <AddClientForm onSuccess={handleSuccess} onCancel={onClose} />
    </BaseModal>
  );
}
