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
  const [allClients, setAllClients] = useState([]);
  const [assignedClientIDs, setAssignedClientIDs] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Reset form state when modal opens
      setPassword('');
      setFeedback({ type: '', message: '' });

      if (userToEdit) {
        setEmail(userToEdit.email || '');
        setRole(userToEdit.role || 'staff');
      } else {
        setEmail('');
        setRole('staff');
      }

      // Fetch all clients for the dropdown, and the user's currently assigned clients
      const fetchInitialData = async () => {
        try {
          const clientsPromise = api.get('/api/clients');
          const userClientsPromise = userToEdit
            ? api.get(`/api/users/${userToEdit.id}/clients`)
            : Promise.resolve({ data: [] });

          const [clientsResponse, userClientsResponse] = await Promise.all([
            clientsPromise,
            userClientsPromise,
          ]);

          setAllClients(clientsResponse.data || []);

          // Create a Set of assigned client IDs for efficient lookup
          const assignedIds = new Set(
            userClientsResponse.data.map((c) => c.client_id),
          );
          setAssignedClientIDs(assignedIds);
        } catch (err) {
          console.error('Failed to load modal data', err);
          setFeedback({
            type: 'error',
            message: 'Could not load client data.',
          });
        } finally {
          setLoading(false);
        }
      };

      fetchInitialData();
    }
  }, [isOpen, userToEdit, api]);

  const handleClientCheckboxChange = (clientId, isChecked) => {
    setAssignedClientIDs((prev) => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(clientId);
      } else {
        newSet.delete(clientId);
      }
      return newSet;
    });
  };

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
        // When editing, we'll save both the role and the client assignments.
        // We run these two API calls in parallel for efficiency.
        const roleUpdatePromise = api.put(`/api/users/${userToEdit.id}`, {
          role,
        });
        const clientsUpdatePromise = api.put(
          `/api/users/${userToEdit.id}/clients`,
          {
            client_ids: Array.from(assignedClientIDs), // Convert the Set to an array
          },
        );

        await Promise.all([roleUpdatePromise, clientsUpdatePromise]);

        setFeedback({ type: 'success', message: 'User updated successfully!' });
      } else {
        // Creating a new user remains the same.
        // An admin can assign clients after the user is created.
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
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">
            Assign to Clients
          </legend>
          <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
            {allClients.length > 0 ? (
              allClients.map((client) => (
                <div key={client.id} className="flex items-center">
                  <input
                    id={`client-${client.id}`}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={assignedClientIDs.has(client.id)}
                    onChange={(e) =>
                      handleClientCheckboxChange(client.id, e.target.checked)
                    }
                    disabled={loading}
                  />
                  <label
                    htmlFor={`client-${client.id}`}
                    className="ml-2 text-sm text-gray-700"
                  >
                    {client.name}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No clients to display.</p>
            )}
          </div>
        </fieldset>
      </form>
    </BaseModal>
  );
}
