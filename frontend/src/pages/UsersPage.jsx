import React, { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import ConfirmModal from '../components/ConfirmModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const isAdmin = localStorage.getItem('role') === 'admin';

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
      } else {
        await axios.post('/api/users', newUser);
      }
      fetchUsers();
      setEditingUser(null);
      setNewUser({ username: '', password: '', role: 'staff' });
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/users/${userToDelete.id}`);
      fetchUsers();
      setShowConfirm(false);
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
      <form onSubmit={handleSubmit} className="space-x-2 mb-4">
        <input name="username" placeholder="Username" value={editingUser ? editingUser.username : newUser.username} onChange={handleChange} required />
        <input name="password" placeholder="Password" type="password" onChange={handleChange} required />
        <select name="role" value={editingUser ? editingUser.role : newUser.role} onChange={handleChange}>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
        <button type="submit">{editingUser ? 'Update' : 'Add'}</button>
      </form>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">Username</th>
            <th className="border p-2">Role</th>
            {isAdmin && <th className="border p-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="border p-2">{user.username}</td>
              <td className="border p-2">{user.role}</td>
              {isAdmin && (
                <td className="border p-2">
                  <button onClick={() => setEditingUser(user)} className="mr-2">Edit</button>
                  <button onClick={() => { setUserToDelete(user); setShowConfirm(true); }} className="text-red-600">Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {showConfirm && userToDelete && (
  <ConfirmModal
    show={true}
    onCancel={() => setShowConfirm(false)}
    onConfirm={handleDelete}
    message={`Delete user "${userToDelete.username}"?`}
  />
)}
    </div>
  );
}
