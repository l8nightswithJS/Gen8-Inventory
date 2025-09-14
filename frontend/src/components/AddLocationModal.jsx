// In frontend/src/components/AddLocationModal.jsx (new file)
import { useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function AddLocationModal({ isOpen, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Location code is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // This calls the POST /api/locations endpoint on your inventory-service
      await api.post('/api/locations', {
        code: code.trim(),
        description: description.trim(),
      });
      onSuccess(); // This will close the modal and refresh the list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create location.');
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
        form="add-location-form"
        variant="primary"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Add Location'}
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Location"
      footer={Footer}
    >
      <form
        id="add-location-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div>
          <label
            htmlFor="loc-code"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location Code (e.g., A-1-1)
          </label>
          <input
            id="loc-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <label
            htmlFor="loc-desc"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (Optional)
          </label>
          <input
            id="loc-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded"
          />
        </div>
      </form>
    </BaseModal>
  );
}
