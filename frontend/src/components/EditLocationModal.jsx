// In frontend/src/components/EditLocationModal.jsx (new file)
import { useState, useEffect } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function EditLocationModal({
  location,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // When the modal opens, pre-fill the form with the location's current data
  useEffect(() => {
    if (location) {
      setCode(location.code || '');
      setDescription(location.description || '');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Location code is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // This calls the PUT /api/locations/:id endpoint we built
      await api.put(`/api/locations/${location.id}`, {
        code: code.trim(),
        description: description.trim(),
      });
      onSuccess(); // This will close the modal and refresh the list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update location.');
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
        form="edit-location-form"
        variant="primary"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Location: ${location?.code}`}
      footer={Footer}
    >
      <form
        id="edit-location-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div>
          <label
            htmlFor="loc-code-edit"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location Code (e.g., A-1-1)
          </label>
          <input
            id="loc-code-edit"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <label
            htmlFor="loc-desc-edit"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (Optional)
          </label>
          <input
            id="loc-desc-edit"
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
