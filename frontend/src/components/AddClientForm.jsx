// src/components/AddClientForm.jsx
import { useState } from 'react';
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
      formData.append('name', name.trim());

      if (logoFile) {
        formData.append('logo', logoFile);
      } else if (logoUrl.trim()) {
        formData.append('logo_url', logoUrl.trim());
      }

      const res = await axios.post('/api/clients', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Client added!');
      setName('');
      setLogoFile(null);
      setLogoUrl('');

      onSuccess && onSuccess(res.data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Error adding client');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h2 className="text-xl font-semibold">Add New Client</h2>

      {error && (
        <div id="add-client-error" className="text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div id="add-client-success" className="text-green-600">
          {success}
        </div>
      )}

      {/* Client Name */}
      <label htmlFor="clientName" className="sr-only">
        Client Name
      </label>
      <input
        id="clientName"
        type="text"
        value={name}
        placeholder="Client Name"
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-gray-300 px-3 py-2 rounded"
        required
        aria-describedby={error ? 'add-client-error' : undefined}
      />

      {/* Upload Logo (file) */}
      <div>
        <label htmlFor="logoFile" className="block text-sm font-medium mb-1">
          Upload Logo
        </label>
        <input
          id="logoFile"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setLogoFile(file);
            if (file) setLogoUrl(''); // keep only one source active
          }}
          className="block w-full text-sm text-gray-700"
        />
      </div>

      {/* Or Logo URL */}
      <div>
        <label htmlFor="logoUrl" className="block text-sm font-medium mb-1">
          or Logo URL
        </label>
        <input
          id="logoUrl"
          type="text"
          value={logoUrl}
          placeholder="https://example.com/logo.png"
          onChange={(e) => {
            setLogoUrl(e.target.value);
            if (e.target.value) setLogoFile(null); // keep only one source active
          }}
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
