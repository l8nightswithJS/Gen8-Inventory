import React, { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function EditClientModal({ client, onClose, refresh }) {
  const [name, setName] = useState(client.name || '');
  const [logo_url, setLogoUrl] = useState(client.logo_url || '');
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    if (!name.trim()) return setError('Client name required.');
    try {
      await axios.put(
        `/api/clients/${client.id}`,
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
      setError('Failed to update client.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Edit Client</h3>
        {error && <p className="text-red-600">{error}</p>}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client Name" />
        <input value={logo_url} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL" />
        <div className="modal-actions">
          <button onClick={handleUpdate}>Update</button>
          <button onClick={onClose} className="cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}
