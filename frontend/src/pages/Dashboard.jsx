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
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-semibold">Client Dashboard</h2>
        <button onClick={handleAddClient} className="bg-blue-600 text-white px-4 py-2 rounded">+ Add Client</button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <ClientCarousel clients={clients} onDelete={handleDelete} />

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchClients}
        />
      )}
    </div>
  );
}
