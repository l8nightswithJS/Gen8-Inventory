import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function UserForm({ user, onClose, onSuccess }) {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'staff');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) return setError('Username required.');
    if (!user && !password.trim()) return setError('Password required.');

    try {
      if (user) {
        await axios.put(`/api/users/${user.id}`, { username, password, role });
      } else {
        await axios.post('/api/users', { username, password, role });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  };

  return (
    <div style={{ background: '#fff', padding: 20, border: '1px solid #ccc', marginTop: 16 }}>
      <h3>{user ? 'Edit User' : 'Add User'}</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          style={{ display: 'block', marginBottom: 10 }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={user ? '(Leave blank to keep existing password)' : 'Password'}
          style={{ display: 'block', marginBottom: 10 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <div style={{ marginTop: 12 }}>
          <button type="submit">Save</button>
          <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
