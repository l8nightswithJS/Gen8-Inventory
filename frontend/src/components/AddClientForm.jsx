import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function AddClientForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
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
      const formData = new FormData();
      formData.append('name', name);
      if (logoFile) formData.append('logo', logoFile);
      else if (logoUrl.trim()) formData.append('logo_url', logoUrl);

      await axios.post('/api/clients', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Client added!');
      setName('');
      setLogoFile(null);
      setLogoUrl('');

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding client');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Add New Client</h2>

      {error && <div className="text-red-600">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}

      <input
        type="text"
        value={name}
        placeholder="Client Name"
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-gray-300 px-3 py-2 rounded"
        required
      />

      <div>
        <label className="block text-sm font-medium mb-1">Upload Logo (Image)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setLogoFile(e.target.files[0])}
          className="block w-full text-sm text-gray-700"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">or Logo URL</label>
        <input
          type="text"
          value={logoUrl}
          placeholder="https://example.com/logo.png"
          onChange={(e) => setLogoUrl(e.target.value)}
          className="w-full border border-gray-300 px-3 py-2 rounded"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Add Client
      </button>
    </form>
  );
}
