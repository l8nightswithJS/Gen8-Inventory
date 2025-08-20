// src/components/AddClientModal.jsx
import { useState } from 'react';
import axios from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

// The form logic is now inside the modal component.
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
      const res = await axios.post('/api/clients', formData, {
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
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div>
        <label
          htmlFor="clientName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Client Name
        </label>
        <input
          id="clientName"
          type="text"
          value={name}
          placeholder="e.g., Acme Labs"
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 px-3 py-2 rounded"
          required
          disabled={loading}
        />
      </div>
      <div>
        <label
          htmlFor="logoFile"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Logo (Optional)
        </label>
        <input
          id="logoFile"
          type="file"
          accept="image/*"
          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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

// The main modal component that is exported.
export default function AddClientModal({ isOpen, onClose, onClientAdded }) {
  const handleSuccess = (client) => {
    onClientAdded?.(client);
    onClose?.();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Client">
      <AddClientForm onSuccess={handleSuccess} onCancel={onClose} />
    </BaseModal>
  );
}
