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
      // Upload logo if selected
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
    <div className={styles.backdrop} onClick={onClose} tabIndex={-1}>
      <form
        className={styles.modal}
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <h2>Add New Client</h2>
        {error && <div className={styles.error}>{error}</div>}

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Client Name"
          className={styles.input}
          required
        />
        <div>
          <label className={styles.label}>Logo:</label>
          {logoPreview && <img src={logoPreview} alt="Preview" className={styles.logoPreview} />}
          <input type="file" accept="image/*" onChange={handleLogoChange} />
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancel}>Cancel</button>
          <button type="submit" className={styles.save} disabled={loading}>
            {loading ? 'Saving...' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
