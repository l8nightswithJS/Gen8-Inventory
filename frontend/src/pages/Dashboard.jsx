import React, { useEffect, useState } from 'react';
import ClientCarousel from '../components/ClientCarousel';
import AddClientModal from '../components/AddClientModal';
import axios from '../utils/axiosConfig';

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/clients');
      setClients(res.data);
    } catch {
      setError('Could not load clients');
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/clients/${id}`);
      fetchClients();
    } catch (err) {
      alert('Failed to delete client.');
    }
  };

  const handleAddClient = () => {
    setShowAddModal(true);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Select a Client</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <ClientCarousel
        clients={clients}
        onClientUpdated={fetchClients}
        onClientDeleted={handleDelete}
        onAddClient={handleAddClient}
      />
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchClients();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
