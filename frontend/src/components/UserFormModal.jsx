// src/components/UserFormModal.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function UserFormModal({
  isOpen,
  onSuccess,
  userToEdit,
  onClose,
}) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('staff');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setUsername(userToEdit.username);
        setRole(userToEdit.role || 'staff');
      } else {
        setUsername('');
        setRole('staff');
      }
      setPassword('');
      setError('');
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || (!userToEdit && !password.trim())) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);

    try {
      const payload = { username: username.trim(), role };

      if (userToEdit) {
        // ✅ Editing user (no password here, backend doesn't allow)
        await axios.put(`/api/users/${userToEdit.id}`, payload);
      } else {
        // ✅ Creating user -> go through auth/register (Supabase handles password)
        payload.password = password.trim();
        await axios.post('/api/auth/register', payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to submit user.',
      );
    } finally {
      setLoading(false);
    }
  };

  const Footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="user-form"
        variant="primary"
        disabled={loading}
      >
        {loading ? 'Saving...' : userToEdit ? 'Update' : 'Add User'}
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={userToEdit ? 'Edit User' : 'Add New User'}
      footer={Footer}
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600 mb-3 text-sm">{error}</p>}
        <div>
          <label
            htmlFor="username-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Username
          </label>
          <input
            id="username-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded"
            required
            disabled={loading}
          />
        </div>

        {!userToEdit && (
          <div>
            <label
              htmlFor="password-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-gray-300 px-3 py-2 rounded"
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
        )}

        <div>
          <label
            htmlFor="role-select"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Role
          </label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded bg-white"
            disabled={loading}
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </form>
    </BaseModal>
  );
}
