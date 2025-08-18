// src/pages/UsersPage.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig';
import ConfirmModal from '../components/ConfirmModal';
import UserForm from '../components/UserForm';

export default function UsersPage() {
  const [users, setUsers] = useState([]); // all users
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirm, setConfirm] = useState({
    type: '', // 'delete' | 'approve' | 'deny'
    id: null, // user ID for the action
    username: '', // username for display
    open: false,
    loading: false,
  });

  const isAdmin = localStorage.getItem('role') === 'admin';

  // fetch all approved + pending users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error('fetchUsers error', err);
    }
  }, []);

  // fetch only pending users
  const fetchPending = useCallback(async () => {
    try {
      const res = await axios.get('/api/users/pending');
      setPendingUsers(res.data);
    } catch (err) {
      console.error('fetchPending error', err);
    }
  }, []);

  // initial load
  useEffect(() => {
    fetchUsers();
    fetchPending();
  }, [fetchUsers, fetchPending]);

  const openForm = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const openConfirm = (type, user) => {
    // ensure pendingUsers up to date
    fetchPending();
    setConfirm({
      type,
      id: user.id,
      username: user.username,
      open: true,
      loading: false,
    });
    console.log('Opening confirm for:', user.id, user.username);
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
    const action = confirm.type;
    const targetId = confirm.id;
    console.log(
      'Confirming action:',
      action,
      'on id:',
      targetId,
      'pending IDs:',
      pendingUsers.map((u) => u.id),
    );

    setConfirm((c) => ({ ...c, loading: true }));

    try {
      if (action === 'approve') {
        await axios.put(`/api/users/${targetId}/approve`);
      } else {
        await axios.delete(`/api/users/${targetId}`);
      }
      closeConfirm();
      await fetchUsers();
      await fetchPending();
    } catch (err) {
      console.error('handleConfirm error', err);
      alert(`Failed to ${action} user. Check console for details.`);
    } finally {
      setConfirm((c) => ({ ...c, loading: false }));
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Users</h2>
        {isAdmin && (
          <button
            onClick={() => openForm(null)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            + Add User
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Username</th>
              <th className="border p-2 text-left">Role</th>
              {isAdmin && <th className="border p-2 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {/* Pending users */}
            {pendingUsers.map((u) => (
              <tr
                key={`p-${u.id}`}
                className="border-t bg-red-50 animate-pulse"
              >
                <td className="p-2">{u.username}</td>
                <td className="p-2 capitalize">{u.role}</td>
                {isAdmin && (
                  <td className="p-2 space-x-3">
                    <button
                      onClick={() => openConfirm('approve', u)}
                      className="text-green-700 hover:underline"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openConfirm('deny', u)}
                      className="text-red-600 hover:underline"
                    >
                      Deny
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {/* Approved users */}
            {users
              .filter((u) => u.approved)
              .map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.username}</td>
                  <td className="p-2 capitalize">{u.role}</td>
                  {isAdmin && (
                    <td className="p-2 space-x-3">
                      <button
                        onClick={() => openForm(u)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openConfirm('delete', u)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-sm w-full mx-4 relative">
            <UserForm
              userToEdit={editingUser}
              onSuccess={() => {
                fetchUsers();
                fetchPending();
                setShowForm(false);
              }}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm.open && (
        <ConfirmModal
          title={
            confirm.type === 'approve'
              ? 'Approve User'
              : confirm.type === 'deny'
              ? 'Deny User'
              : 'Delete User'
          }
          message={
            confirm.type === 'approve'
              ? `Approve "${confirm.username}"?`
              : confirm.type === 'deny'
              ? `Deny "${confirm.username}"? This deletes their request.`
              : `Delete "${confirm.username}"?`
          }
          variant={confirm.type === 'approve' ? 'success' : 'danger'}
          cancelText="No"
          confirmText="Yes"
          loading={confirm.loading}
          onCancel={closeConfirm}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
