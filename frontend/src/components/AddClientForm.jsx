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
      await axios.post(
        'http://localhost:8000/api/clients',
        { name, logo_url },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
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
      padding: '1rem',
      borderRadius: '5px',
      border: '1px solid #ccc',
      maxWidth: '400px',
      margin: '1rem auto'
    }}>
      <h3>Add New Client</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <input
        type="text"
        placeholder="Client Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: '1rem' }}
      />
      <input
        type="text"
        placeholder="Logo URL (optional)"
        value={logo_url}
        onChange={(e) => setLogoUrl(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: '1rem' }}
      />
      <button type="submit">Add Client</button>
    </form>
  );
}
