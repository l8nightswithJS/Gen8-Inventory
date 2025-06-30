import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function AddClientModal({ onClose, refresh }) {
  const [name, setName] = useState('');
  const [logo_url, setLogoUrl] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return setError('Client name required.');
    try {
      await axios.post(
        '/api/clients',
        { name, logo_url },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (refresh) refresh();
      onClose();
    } catch (err) {
      setError('Failed to add client.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add Client</h3>
        {error && <p className="text-red-600">{error}</p>}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client Name" />
        <input value={logo_url} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL (optional)" />
        <div className="modal-actions">
          <button onClick={handleAdd}>Add</button>
          <button onClick={onClose} className="cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}
