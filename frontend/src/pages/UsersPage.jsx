import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import ConfirmModal from '../components/ConfirmModal';
import UserFormModal from '../components/UserFormModal';
import Button from '../components/ui/Button';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const normalizeUser = (user) => ({
  ...user,
  email: user.email || user.username,
  fullName: [user.first_name, user.last_name].filter(Boolean).join(' '),
});

const roleLabel = (role = '') =>
  role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const UserCard = ({ user, onApprove, onDeny, onEdit, onDelete, isPending }) => (
  <article
    className={`mb-4 rounded-lg border bg-white p-4 shadow-md dark:bg-slate-900 ${
      isPending
        ? 'border-amber-300 dark:border-amber-500/30'
        : 'border-slate-200 dark:border-slate-800'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-800 dark:text-white">
          {user.fullName || 'Name not set'}
        </p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
          {user.email}
        </p>
        <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {roleLabel(user.role)}
        </span>
      </div>
      {isPending ? (
        <div className="flex items-center gap-2">
          <Button onClick={() => onApprove(user)} size="sm" variant="primary">
            Approve
          </Button>
          <Button onClick={() => onDeny(user)} size="sm" variant="danger">
            Deny
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            onClick={() => onEdit(user)}
            variant="ghost"
            size="sm"
            aria-label={`Edit ${user.fullName || user.email}`}
          >
            <FiEdit2 aria-hidden="true" />
          </Button>
          <Button
            onClick={() => onDelete(user)}
            variant="ghost"
            size="sm"
            aria-label={`Delete ${user.fullName || user.email}`}
            className="text-rose-600"
          >
            <FiTrash2 aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  </article>
);

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirm, setConfirm] = useState({
    type: '',
    id: null,
    label: '',
    open: false,
    loading: false,
  });
  const [viewMode, setViewMode] = useState('desktop');

  useEffect(() => {
    const handleResize = () =>
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop');
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const [usersRes, pendingRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/users/pending'),
      ]);
      setUsers((usersRes.data || []).map(normalizeUser));
      setPendingUsers((pendingRes.data || []).map(normalizeUser));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const openForm = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const openConfirm = (type, user) => {
    setConfirm({
      type,
      id: user.id,
      label: user.fullName || user.email,
      open: true,
      loading: false,
    });
  };

  const closeConfirm = () =>
    setConfirm({ type: '', id: null, label: '', open: false, loading: false });

  const handleConfirm = async () => {
    setConfirm((current) => ({ ...current, loading: true }));
    try {
      if (confirm.type === 'approve') {
        await api.post(`/api/users/${confirm.id}/approve`);
      } else {
        await api.delete(`/api/users/${confirm.id}`);
      }
      await fetchAllUsers();
    } catch (err) {
      console.error('handleConfirm error', err);
      alert(`Failed to ${confirm.type} user.`);
    } finally {
      closeConfirm();
    }
  };

  const UserTable = () => (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full border-collapse text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
              Role
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map((user) => (
            <tr
              key={`pending-${user.id}`}
              className="border-b border-slate-100 bg-amber-50 last:border-b-0 dark:border-slate-800 dark:bg-amber-900/10"
            >
              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                {user.fullName || 'Name not set'}
                <span className="ml-2 font-normal text-amber-600 dark:text-amber-400">
                  (Pending)
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.email}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{roleLabel(user.role)}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={() => openConfirm('approve', user)} size="sm" variant="primary">Approve</Button>
                  <Button onClick={() => openConfirm('deny', user)} size="sm" variant="danger">Deny</Button>
                </div>
              </td>
            </tr>
          ))}
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                {user.fullName || 'Name not set'}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.email}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{roleLabel(user.role)}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    onClick={() => openForm(user)}
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${user.fullName || user.email}`}
                  >
                    <FiEdit2 aria-hidden="true" />
                  </Button>
                  <Button
                    onClick={() => openConfirm('delete', user)}
                    variant="ghost"
                    size="sm"
                    className="text-rose-600"
                    aria-label={`Delete ${user.fullName || user.email}`}
                  >
                    <FiTrash2 aria-hidden="true" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Manage Users
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Manage user identity, global roles, and project-specific access.
          </p>
        </div>
        <Button variant="secondary" onClick={() => openForm(null)}>
          + Add User
        </Button>
      </div>

      {viewMode === 'mobile' ? (
        <div>
          {pendingUsers.map((user) => (
            <UserCard
              key={`pending-${user.id}`}
              user={user}
              onApprove={openConfirm.bind(null, 'approve')}
              onDeny={openConfirm.bind(null, 'deny')}
              isPending
            />
          ))}
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={openForm}
              onDelete={openConfirm.bind(null, 'delete')}
            />
          ))}
        </div>
      ) : (
        <UserTable />
      )}

      <UserFormModal
        isOpen={showForm}
        userToEdit={editingUser}
        onSuccess={() => {
          fetchAllUsers();
          setShowForm(false);
          setEditingUser(null);
        }}
        onClose={() => {
          setShowForm(false);
          setEditingUser(null);
        }}
        api={api}
      />

      {confirm.open && (
        <ConfirmModal
          title={`${confirm.type.charAt(0).toUpperCase() + confirm.type.slice(1)} User`}
          message={`Are you sure you want to ${confirm.type} "${confirm.label}"?`}
          variant={confirm.type === 'approve' ? 'primary' : 'danger'}
          onCancel={closeConfirm}
          onConfirm={handleConfirm}
          loading={confirm.loading}
        />
      )}
    </div>
  );
}
