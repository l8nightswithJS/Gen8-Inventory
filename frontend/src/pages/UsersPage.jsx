// src/pages/UsersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig';
import ConfirmModal from '../components/ConfirmModal';
import UserForm from '../components/UserForm';

export default function UsersPage() {
  const [users, setUsers] = useState([]); // approved & all
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirm, setConfirm] = useState({
    type: '', // 'delete' | 'approve' | 'deny'
    user: null,
    open: false,
    loading: false,
  });

  const isAdmin = localStorage.getItem('role') === 'admin';

  // fetch all approved+pending
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error('fetchUsers error', err);
    }
  }, []);

  // fetch only pending
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
    setConfirm({ type, user, open: true, loading: false });
  };
  const closeConfirm = () =>
    setConfirm({ type: '', user: null, open: false, loading: false });

  const handleConfirm = async () => {
    setConfirm((c) => ({ ...c, loading: true }));

    try {
      if (confirm.type === 'approve') {
        await axios.put(`/api/users/${confirm.user.id}/approve`);
      } else {
        // both 'deny' and 'delete' do a delete
        await axios.delete(`/api/users/${confirm.user.id}`);
      }
    } catch (err) {
      console.error('handleConfirm error', err);
      alert(`Failed to ${confirm.type} user. Check console for details.`);
    } finally {
      // refresh both lists & close
      await fetchUsers();
      await fetchPending();
      closeConfirm();
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
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
            {/* Pending first */}
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

            {/* Already-approved */}
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
              ? `Approve "${confirm.user.username}"?`
              : confirm.type === 'deny'
              ? `Deny "${confirm.user.username}"? This deletes their request.`
              : `Delete "${confirm.user.username}"?`
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
