// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import ClientCarousel from '../components/ClientCarousel';
import AddClientModal from '../components/AddClientModal';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [clients, setClients]             = useState([]);
  const [error, setError]                 = useState('');
  const [showAddModal, setShowAddModal]   = useState(false);

  // load clients from Supabase
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      setClients(data);
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
        <h2 className="text-2xl font-bold text-gray-800">
          Projects Dashboard
        </h2>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <ClientCarousel
        clients={clients}
        onClientDeleted={async (id) => {
          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);
          if (!error) fetchClients();
        }}
        onClientUpdated={() => fetchClients()}
        onAddClient={() => setShowAddModal(true)}
      />

      {/* Render AddClientModal; it returns null if isOpen is false */}
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
