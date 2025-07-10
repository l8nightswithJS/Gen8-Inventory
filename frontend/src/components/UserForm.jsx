import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

export default function UserForm({ onSuccess, userToEdit, onClose }) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('staff');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.username);
      setRole(userToEdit.role || 'staff');
      setPassword('');
    } else {
      setUsername('');
      setRole('staff');
      setPassword('');
    }
  }, [userToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || (!userToEdit && !password)) {
      setError('Username and password are required.');
      return;
    }

    try {
      if (userToEdit) {
        await axios.put(`/api/users/${userToEdit.id}`, { username, role, password });
      } else {
        await axios.post('/api/users', { username, role, password });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to submit user.');
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-md w-full max-w-sm mx-auto">
      <h3 className="text-lg font-semibold mb-4">{userToEdit ? 'Edit User' : 'Add New User'}</h3>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full border border-gray-300 px-3 py-2 rounded"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={userToEdit ? "New Password (optional)" : "Password"}
          className="w-full border border-gray-300 px-3 py-2 rounded"
          required={!userToEdit}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border border-gray-300 px-3 py-2 rounded"
        >
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {userToEdit ? 'Update' : 'Add User'}
          </button>
        </div>
      </form>
    </div>
  );
}
