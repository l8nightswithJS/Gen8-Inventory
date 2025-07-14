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
      const res = await axios.get('/api/clients');
      setClients(res.data);
    } catch {
      setError('Could not load clients');
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Client Dashboard</h2>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <ClientCarousel
        clients={clients}
        onClientDeleted={async (id) => {
          await axios.delete(`/api/clients/${id}`);
          fetchClients();
        }}
        onClientUpdated={fetchClients}
        onAddClient={() => setShowAddModal(true)}
      />

      {showAddModal && (
        <AddClientModal
          isOpen={showAddModal} // ✅ REQUIRED for visibility
          onClose={() => setShowAddModal(false)}
          onClientAdded={() => {
            fetchClients();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
