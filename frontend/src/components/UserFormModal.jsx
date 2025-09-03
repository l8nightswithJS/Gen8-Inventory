// frontend/src/components/UserFormModal.jsx
import { useState, useEffect } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function UserFormModal({
  isOpen,
  onSuccess,
  userToEdit,
  onClose,
  api, // The authApi instance passed from UsersPage.jsx
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setEmail(userToEdit.email || userToEdit.username || '');
        setRole(
          ['admin', 'staff'].includes(userToEdit.role)
            ? userToEdit.role
            : 'staff',
        );
      } else {
        setEmail('');
        setRole('staff');
      }
      setPassword('');
      setFeedback({ type: '', message: '' });
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!email.trim() || (!userToEdit && !password.trim())) {
      setFeedback({
        type: 'error',
        message: 'Email and password are required.',
      });
      return;
    }

    setLoading(true);
    try {
      if (userToEdit) {
        await api.put(`/api/users/${userToEdit.id}`, { role });
        setFeedback({ type: 'success', message: 'User updated successfully!' });
      } else {
        await api.post('/api/auth/register', {
          email: email.trim(),
          role,
          password: password.trim(),
        });
        setFeedback({ type: 'success', message: 'User created successfully!' });
      }
      onSuccess?.();
      setTimeout(onClose, 2000); // auto-close after success
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message ||
          err.message ||
          'Failed to submit user.',
      });
    } finally {
      setLoading(false);
    }
  };

  const FeedbackBanner = () =>
    feedback.message && (
      <div
        className={`p-2 rounded text-sm mb-2 ${
          feedback.type === 'error'
            ? 'bg-red-50 text-red-600'
            : 'bg-green-50 text-green-700'
        }`}
      >
        {feedback.message}
      </div>
    );

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
        <FeedbackBanner />

        <div>
          <label
            htmlFor="email-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded"
            required
            disabled={loading || userToEdit}
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
            <p className="text-xs text-gray-500 mt-1">Min 6 characters.</p>
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
