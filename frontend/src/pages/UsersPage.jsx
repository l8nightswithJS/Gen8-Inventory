import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import ConfirmModal from '../components/ConfirmModal';
import UserFormModal from '../components/UserFormModal';
import Button from '../components/ui/Button';
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

const UserCard = ({ user, onApprove, onDeny, onEdit, onDelete, isPending }) => (
  <div
    className={`rounded-lg border bg-white shadow-md p-4 mb-4 ${
      isPending ? 'border-amber-300' : 'border-slate-200'
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="font-bold text-lg text-slate-800">{user.username}</p>
        <p className="text-sm font-medium bg-slate-100 text-slate-600 inline-block px-2 py-0.5 rounded-full mt-1 capitalize">
          {user.role}
        </p>
      </div>
      {isPending ? (
        <div className="flex items-center gap-2">
          <Button onClick={() => onApprove(user)} size="sm" variant="success">
            <FiCheck className="mr-2" />
            Approve
          </Button>
          <Button onClick={() => onDeny(user)} size="sm" variant="danger">
            <FiX className="mr-2" />
            Deny
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            onClick={() => onEdit(user)}
            variant="ghost"
            size="sm"
            title="Edit"
          >
            <FiEdit2 />
          </Button>
          <Button
            onClick={() => onDelete(user)}
            variant="ghost"
            size="sm"
            title="Delete"
            className="text-rose-600"
          >
            <FiTrash2 />
          </Button>
        </div>
      )}
    </div>
  </div>
);

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirm, setConfirm] = useState(
    {
      type: '',
      id: null,
      username: '',
      open: false,
      loading: false,
    },
    [],
  );
  const [viewMode, setViewMode] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      window.innerWidth < 768 ? setViewMode('mobile') : setViewMode('desktop');
    };
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
      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
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
      id: user.uid,
      username: user.username,
      open: true,
      loading: false,
    });
  };
  const closeConfirm = () =>
    setConfirm({
      type: '',
      id: null,
      username: '',
      open: false,
      loading: false,
    });

  const handleConfirm = async () => {
    setConfirm((c) => ({ ...c, loading: true }));
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
  console.log('render', { users, pendingUsers, viewMode });

  const UserTable = () => (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
              Username
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
              Role
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map((u) => (
            <tr
              key={`p-${u.id}`}
              className="border-b last:border-b-0 bg-amber-50"
            >
              <td className="px-4 py-3 font-medium text-slate-800">
                {u.username}{' '}
                <span className="text-amber-600 font-normal">(Pending)</span>
              </td>
              <td className="px-4 py-3 capitalize text-slate-600">{u.role}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={() => openConfirm('approve', u)}
                    size="sm"
                    variant="success"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => openConfirm('deny', u)}
                    size="sm"
                    variant="danger"
                  >
                    Deny
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b last:border-b-0 hover:bg-slate-50"
            >
              <td className="px-4 py-3 font-medium text-slate-800">
                {u.username}
              </td>
              <td className="px-4 py-3 capitalize text-slate-600">{u.role}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button onClick={() => openForm(u)} variant="ghost" size="sm">
                    <FiEdit2 />
                  </Button>
                  <Button
                    onClick={() => openConfirm('delete', u)}
                    variant="ghost"
                    size="sm"
                    className="text-rose-600"
                  >
                    <FiTrash2 />
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
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Manage Users
        </h1>
        <Button variant="secondary" onClick={() => openForm(null)}>
          + Add User
        </Button>
      </div>

      {viewMode === 'mobile' ? (
        <div>
          {pendingUsers.map((u) => (
            <UserCard
              key={`p-${u.id}`}
              user={u}
              onApprove={openConfirm.bind(null, 'approve')}
              onDeny={openConfirm.bind(null, 'deny')}
              isPending
            />
          ))}
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
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
        }}
        onClose={() => setShowForm(false)}
        api={api}
      />

      {confirm.open && (
        <ConfirmModal
          title={`${
            confirm.type.charAt(0).toUpperCase() + confirm.type.slice(1)
          } User`}
          message={`Are you sure you want to ${confirm.type} "${confirm.username}"?`}
          variant={confirm.type === 'approve' ? 'success' : 'danger'}
          onCancel={closeConfirm}
          onConfirm={handleConfirm}
          loading={confirm.loading}
        />
      )}
    </div>
  );
}
