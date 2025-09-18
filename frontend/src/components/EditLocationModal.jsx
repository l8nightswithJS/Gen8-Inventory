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
      await api.put(`/api/locations/${location.id}`, {
        code: code.trim(),
        description: description.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update location.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    'w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Location: ${location?.code}`}
      footer={
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
      }
    >
      <form
        id="edit-location-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
            {error}
          </p>
        )}
        <div>
          <label
            htmlFor="loc-code-edit"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Location Code (e.g., A-1-1)
          </label>
          <input
            id="loc-code-edit"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputStyles}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="loc-desc-edit"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Description (Optional)
          </label>
          <input
            id="loc-desc-edit"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputStyles}
            disabled={loading}
          />
        </div>
      </form>
    </BaseModal>
  );
}
