import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
      // 1) Upload the file to Supabase Storage (bucket: "client-logos")
      let finalLogoUrl = '';
      if (logoFile) {
        const fileName = `${Date.now()}_${logoFile.name}`;
        const { error: uploadError } = await supabase
          .storage
          .from('client-logos')
          .upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        const { publicURL, error: urlError } = supabase
          .storage
          .from('client-logos')
          .getPublicUrl(fileName);
        if (urlError) throw urlError;
        finalLogoUrl = publicURL;
      }
      // 2) Or use the URL text input if provided
      else if (logoUrl.trim()) {
        finalLogoUrl = logoUrl.trim();
      }

      // 3) Insert the new client record
      const { data, error: insertError } = await supabase
        .from('clients')
        .insert([{ name, logo_url: finalLogoUrl }])
        .single();
      if (insertError) throw insertError;

      setSuccess('Client added!');
      setName('');
      setLogoFile(null);
      setLogoUrl('');

      // notify parent after a brief delay
      setTimeout(() => {
        onSuccess && onSuccess(data);
      }, 500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error adding client');
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
        <label className="block text-sm font-medium mb-1">Upload Logo</label>
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
