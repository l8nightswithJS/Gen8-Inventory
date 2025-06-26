import React, { useState } from 'react';
import styles from './AddClientModal.module.css';
import axios from '../utils/axiosConfig';

export default function AddClientModal({ onSuccess, onClose }) {
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogoChange = e => {
    if (e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setLogoPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError('Client name is required.');
      setLoading(false);
      return;
    }

    let logo_url = '';
    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadRes = await axios.post('/api/clients/upload-logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        logo_url = uploadRes.data.url;
      }

      await axios.post('/api/clients', { name, logo_url });
      setLoading(false);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding client');
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h2>Add New Client</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Client Name"
            required
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
          />
          {logoPreview && <img src={logoPreview} alt="Preview" style={{ maxWidth: '100px', margin: '1rem 0' }} />}
          {error && <div style={{ color: 'red' }}>{error}</div>}
          <div className={styles.buttons}>
            <button type="submit" disabled={loading}>Add Client</button>
            <button type="button" onClick={onClose} className={styles.cancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
// This code defines a modal component for adding a new client, allowing users to input a client name and upload a logo image.