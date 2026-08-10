import { useEffect, useState } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const ROLE_OPTIONS = [
  ['admin', 'Administrator'],
  ['inventory_staff', 'Inventory Staff'],
  ['project_user', 'Project User'],
  ['external_viewer', 'External Viewer'],
];

export default function UserFormModal({ isOpen, onSuccess, userToEdit, onClose, api }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('project_user');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [accessByClient, setAccessByClient] = useState(new Map());

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setPassword('');
    setFeedback({ type: '', message: '' });
    setEmail(userToEdit?.email || '');
    setRole(userToEdit?.role || 'project_user');

    const fetchInitialData = async () => {
      try {
        const [clientsRes, assignmentsRes] = await Promise.all([
          api.get('/api/clients'),
          userToEdit ? api.get(`/api/users/${userToEdit.id}/clients`) : Promise.resolve({ data: [] }),
        ]);

        setAllClients(clientsRes.data || []);
        const next = new Map();
        for (const assignment of assignmentsRes.data || []) {
          next.set(Number(assignment.client_id), assignment.access_level === 'read' ? 'read' : 'edit');
        }
        setAccessByClient(next);
      } catch {
        setFeedback({ type: 'error', message: 'Failed to load project access.' });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isOpen, userToEdit, api]);

  const setClientEnabled = (clientId, enabled) => {
    setAccessByClient((previous) => {
      const next = new Map(previous);
      if (!enabled) next.delete(clientId);
      else next.set(clientId, role === 'external_viewer' ? 'read' : next.get(clientId) || 'read');
      return next;
    });
  };

  const setClientLevel = (clientId, level) => {
    setAccessByClient((previous) => {
      const next = new Map(previous);
      next.set(clientId, role === 'external_viewer' ? 'read' : level);
      return next;
    });
  };

  const handleRoleChange = (value) => {
    setRole(value);
    if (value === 'external_viewer') {
      setAccessByClient((previous) => new Map([...previous.keys()].map((id) => [id, 'read'])));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setFeedback({ type: '', message: '' });

    const assignedClients = [...accessByClient.entries()].map(([client_id, access_level]) => ({
      client_id,
      access_level: role === 'external_viewer' ? 'read' : access_level,
    }));

    const userData = { email, role, assigned_clients: assignedClients };
    if (password) userData.password = password;

    try {
      if (userToEdit) await api.put(`/api/users/${userToEdit.id}`, userData);
      else await api.post('/api/users', userData);
      onSuccess();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Unable to save user.' });
    } finally {
      setLoading(false);
    }
  };

  const isCreating = !userToEdit;
  const inputStyles = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isCreating ? 'Create User' : `Edit User: ${userToEdit?.email}`}
      size="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="user-form" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : isCreating ? 'Create User' : 'Save Access'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
        {feedback.message && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {feedback.message}
          </p>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyles} required disabled={loading} />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{isCreating ? 'Temporary password' : 'New password (optional)'}</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputStyles} minLength={8} required={isCreating} disabled={loading} autoComplete="new-password" />
        </div>

        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Global role</label>
          <select id="role" value={role} onChange={(e) => handleRoleChange(e.target.value)} className={inputStyles} disabled={loading}>
            {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Only Administrators can create clients, manage users, or change access. External Viewers are always read-only.
          </p>
        </div>

        {role !== 'admin' && (
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Project access</legend>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-300 p-2 dark:border-slate-700">
              {allClients.length > 0 ? allClients.map((client) => {
                const enabled = accessByClient.has(Number(client.id));
                const level = accessByClient.get(Number(client.id)) || 'read';
                return (
                  <div key={client.id} className="flex flex-col gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex min-h-10 items-center gap-3 text-sm text-gray-700 dark:text-slate-300">
                      <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={enabled} onChange={(e) => setClientEnabled(Number(client.id), e.target.checked)} disabled={loading} />
                      <span className="font-medium">{client.name}</span>
                    </label>
                    {enabled && (
                      <select value={role === 'external_viewer' ? 'read' : level} onChange={(e) => setClientLevel(Number(client.id), e.target.value)} disabled={loading || role === 'external_viewer'} aria-label={`${client.name} access level`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        <option value="read">Read Only</option>
                        <option value="edit">Edit</option>
                      </select>
                    )}
                  </div>
                );
              }) : <p className="p-2 text-sm text-gray-500 dark:text-slate-400">No projects available.</p>}
            </div>
          </fieldset>
        )}
      </form>
    </BaseModal>
  );
}
