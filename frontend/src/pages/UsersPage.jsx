import React, { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import UserTable from '../components/UserTable';
import UserForm from '../components/UserForm';
import ConfirmModal from '../components/ConfirmModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);

  const fetchUsers = async () => {
    const res = await axios.get('/api/users');
    setUsers(res.data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async () => {
    await axios.delete(`/api/users/${deletingUser.id}`);
    setDeletingUser(null);
    fetchUsers();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>User Management</h2>
      <button onClick={handleCreate}>Add User</button>

      <UserTable users={users} onEdit={handleEdit} onDelete={setDeletingUser} />

      {showForm && (
        <UserForm
          user={editingUser}
          onClose={() => setShowForm(false)}
          onSuccess={fetchUsers}
        />
      )}

    {deletingUser && (
        <ConfirmModal
            title="Delete User"
            message={`Are you sure you want to delete "${deletingUser.username}"?`}
            onConfirm={handleDelete}
            onCancel={() => setDeletingUser(null)}
        />
    )}
    </div>
  );
}
