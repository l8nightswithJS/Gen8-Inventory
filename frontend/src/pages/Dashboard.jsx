import { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig'; // Keep original for creating new instances
import ClientCarousel from '../components/ClientCarousel';
import AddClientModal from '../components/AddClientModal';
import Button from '../components/ui/Button';

// Create a new, separate axios instance specifically for the client service
const clientApi = axios.create({
  baseURL: `${process.env.REACT_APP_CLIENT_API_URL}`,
});

// Add the auth token interceptor to every request for the new instance
clientApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      // Use the new clientApi instance to make the request
      const res = await clientApi.get('/api/clients');
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
      // Use the new clientApi instance for the delete request
      await clientApi.delete(`/api/clients/${id}`);
      fetchClients();
    } catch {
      setError('Failed to delete client.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Clients
        </h1>
        <Button variant="secondary" onClick={() => setShowAddModal(true)}>
          + Add Client
        </Button>
      </div>

      {error && <p className="text-red-500 mb-4 px-4 sm:px-0">{error}</p>}

      <div className="px-4 sm:px-0">
        <ClientCarousel
          clients={clients}
          onClientDeleted={handleDelete}
          onClientUpdated={fetchClients}
        />
      </div>

      {showAddModal && (
        <AddClientModal
          isOpen={showAddModal}
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
