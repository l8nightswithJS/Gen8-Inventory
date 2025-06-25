import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function AddClientForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [logo_url, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name.trim()) {
      setError('Client name is required.');
      return;
    }
    try {
      await axios.post('http://localhost:8000/api/clients', { name, logo_url });
      setSuccess('Client added!');
      setName('');
      setLogoUrl('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding client');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#f9f9f9',
      padding: 16,
      borderRadius: 8,
      boxShadow: '0 1px 4px #ccc',
      marginBottom: '2rem'
    }}>
      <h3>Add New Client</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Client Name"
        style={{ marginBottom: 8, width: '100%' }}
      />
      <input
        value={logo_url}
        onChange={e => setLogoUrl(e.target.value)}
        placeholder="Logo URL (optional)"
        style={{ marginBottom: 8, width: '100%' }}
      />
      <button type="submit">Add Client</button>
    </form>
  );
}
