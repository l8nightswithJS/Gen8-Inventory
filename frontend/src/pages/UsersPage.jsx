import React, { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import ConfirmModal from '../components/ConfirmModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (editingUser) {
      setEditingUser({ ...editingUser, [name]: value });
    } else {
      setNewUser({ ...newUser, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, editingUser);
        setEditingUser(null);
      } else {
        await axios.post('/api/users', newUser);
        setNewUser({ username: '', password: '', role: 'staff' });
      }
      fetchUsers();
    } catch (err) {
      console.error('Save user error:', err);
    }
  };

  const handleEdit = (user) => setEditingUser(user);

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/users/${userToDelete.id}`);
      fetchUsers();
    } catch (err) {
      console.error('Delete user error:', err);
    }
    setShowConfirm(false);
    setUserToDelete(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">User Management</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 mb-8"
      >
        <h3 className="text-xl font-bold mb-4">
          {editingUser ? 'Edit User' : 'Add New User'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            className="border p-2 rounded"
            type="text"
            name="username"
            placeholder="Username"
            value={editingUser ? editingUser.username : newUser.username}
            onChange={handleChange}
            required
          />
          <input
            className="border p-2 rounded"
            type="password"
            name="password"
            placeholder="Password"
            value={editingUser ? editingUser.password || '' : newUser.password}
            onChange={handleChange}
            required={!editingUser} // Only required when adding
          />
          <select
            className="border p-2 rounded"
            name="role"
            value={editingUser ? editingUser.role : newUser.role}
            onChange={handleChange}
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        <button
          type="submit"
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        >
          {editingUser ? 'Update User' : 'Add User'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Username</th>
              <th className="p-2 border">Role</th>
              <th className="p-2 border">Created</th>
              <th className="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-2 border">{u.username}</td>
                <td className="p-2 border capitalize">{u.role}</td>
                <td className="p-2 border">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-2 border text-center space-x-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => handleEdit(u)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => handleDeleteClick(u)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Confirm Delete"
          message={`Delete user "${userToDelete.username}"? This cannot be undone.`}
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
