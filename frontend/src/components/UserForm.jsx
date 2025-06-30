import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function UserForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!email || !password) return setError('Email and password required');
    try {
      await axios.post(
        '/api/users',
        { email, role, password },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      onSuccess();
      setEmail('');
      setRole('viewer');
      setPassword('');
      setError('');
    } catch (err) {
      setError('Failed to add user.');
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Add New User</h3>
      {error && <p className="text-red-600">{error}</p>}
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="viewer">Viewer</option>
        <option value="admin">Admin</option>
      </select>
      <button onClick={handleAdd} className="mt-2">Add User</button>
    </div>
  );
}
