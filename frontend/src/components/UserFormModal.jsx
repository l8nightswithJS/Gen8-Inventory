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
      setPassword('');
      setFeedback({ type: '', message: '' });

      if (userToEdit) {
        setEmail(userToEdit.email || '');
        setRole(userToEdit.role || 'staff');
      } else {
        setEmail('');
        setRole('staff');
      }

      const fetchInitialData = async () => {
        try {
          const clientsPromise = api.get('/api/clients');
          const assignmentsPromise = userToEdit
            ? api.get(`/api/users/${userToEdit.id}/clients`)
            : Promise.resolve({ data: [] });

          const [clientsRes, assignmentsRes] = await Promise.all([
            clientsPromise,
            assignmentsPromise,
          ]);

          setAllClients(clientsRes.data || []);
          setAssignedClientIDs(
            new Set((assignmentsRes.data || []).map((c) => c.client_id)),
          );
        } catch (error) {
          setFeedback({
            type: 'error',
            message: 'Failed to load initial data.',
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
    setLoading(true);
    setFeedback({ type: '', message: '' });

    const userData = {
      email,
      role,
      assigned_clients: Array.from(assignedClientIDs),
    };
    if (password) {
      userData.password = password;
    }

    try {
      if (userToEdit) {
        await api.put(`/api/users/${userToEdit.id}`, userData);
      } else {
        await api.post('/api/users', userData);
      }
      onSuccess();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'An error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const isCreating = !userToEdit;
  const inputStyles =
    'w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const title = isCreating
    ? 'Create New User'
    : `Edit User: ${userToEdit?.email}`;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-form"
            variant="primary"
            disabled={loading}
          >
            {loading
              ? 'Saving...'
              : isCreating
              ? 'Create User'
              : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {feedback.message && (
          <p
            className={`rounded p-3 text-sm ${
              feedback.type === 'error'
                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            }`}
          >
            {feedback.message}
          </p>
        )}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputStyles}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputStyles}
            placeholder={
              isCreating ? 'Required' : 'Optional: Leave blank to keep current'
            }
            required={isCreating}
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputStyles}
            disabled={loading}
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Assign to Clients
          </legend>
          <div className="max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-md p-2 space-y-1">
            {allClients.length > 0 ? (
              allClients.map((client) => (
                <div key={client.id} className="flex items-center">
                  <input
                    id={`client-${client.id}`}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-500"
                    checked={assignedClientIDs.has(client.id)}
                    onChange={(e) =>
                      handleClientCheckboxChange(client.id, e.target.checked)
                    }
                    disabled={loading}
                  />
                  <label
                    htmlFor={`client-${client.id}`}
                    className="ml-2 text-sm text-gray-700 dark:text-slate-300"
                  >
                    {client.name}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No clients to display.
              </p>
            )}
          </div>
        </fieldset>
      </form>
    </BaseModal>
  );
}
