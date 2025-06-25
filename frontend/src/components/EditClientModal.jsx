import React, { useState } from 'react';
import styles from './EditClientModal.module.css';
import axios from '../utils/axiosConfig';

export default function EditClientModal({ client, onClose, onUpdated }) {
  const [name, setName] = useState(client.name || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(client.logo_url || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogoChange = e => {
    if (e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let finalLogoUrl = client.logo_url || '';

    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadRes = await axios.post('/api/clients/upload-logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalLogoUrl = uploadRes.data.url;
      }

      await axios.put(`/api/clients/${client.id}`, {
        name: name.trim(),
        logo_url: finalLogoUrl
      });

      setLoading(false);
      onUpdated && onUpdated({ ...client, name, logo_url: finalLogoUrl });
      onClose();
    } catch (err) {
      setError('Failed to update client');
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} tabIndex={-1} onClick={onClose}>
      <form
        className={styles.modal}
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <h2>Edit Client</h2>
        {error && <div className={styles.error}>{error}</div>}

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className={styles.input}
          placeholder="Client Name"
        />

        <div>
          <label className={styles.label}>Logo:</label>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo Preview"
              className={styles.logoPreview}
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className={styles.fileInput}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className={styles.save} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
