import { useState, useEffect } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

// Accept the new `api` prop
export default function UserFormModal({
  isOpen,
  onSuccess,
  userToEdit,
  onClose,
  api, // The authApi instance passed from UsersPage.jsx
}) {
  const [email, setEmail] = useState(''); // Changed from username to email
  const [role, setRole] = useState('staff');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        // The user object from the DB has a username, but we need the email for auth
        // Assuming email might not be present on the old user object, default to empty
        setEmail(userToEdit.email || userToEdit.username);
        setRole(userToEdit.role || 'staff');
      } else {
        setEmail('');
        setRole('staff');
      }
      setPassword('');
      setError('');
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || (!userToEdit && !password.trim())) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);

    try {
      if (userToEdit) {
        // Editing user - payload only needs role
        const payload = { role };
        // UPDATED: Use the passed-in `api` instance
        await api.put(`/api/users/${userToEdit.id}`, payload);
      } else {
        // Creating user - payload needs email, password, and role
        const payload = {
          email: email.trim(),
          role,
          password: password.trim(),
        };
        // UPDATED: Use the passed-in `api` instance
        await api.post('/api/auth/register', payload);
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
            htmlFor="email-input" // Changed from username-input
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="email-input" // Changed from username-input
            type="email" // Changed from text to email
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded"
            required
            disabled={loading || userToEdit} // Disable email editing
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
