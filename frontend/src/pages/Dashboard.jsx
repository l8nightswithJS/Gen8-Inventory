import { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig';
import ClientCarousel from '../components/ClientCarousel';
import AddClientModal from '../components/AddClientModal';

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const res = await axios.get('/api/clients');
      setClients(res.data);
      setError('');
    } catch {
      setError('Could not load clients.');
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      await axios.delete(`/api/clients/${id}`);
      fetchClients();
    } catch {
      setError('Failed to delete client.');
    }
  };

  return (
    <div className="px-4 py-8 max-w-screen-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Projects Dashboard</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <ClientCarousel
        clients={clients}
        onClientDeleted={handleDelete}
        onClientUpdated={fetchClients}
        onAddClient={() => setShowAddModal(true)}
      />

      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onClientAdded={() => {
          fetchClients();
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
