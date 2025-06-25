import React, { useEffect, useState } from 'react';
import ClientCarousel from '../components/ClientCarousel';
import axios from '../utils/axiosConfig';

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8000/api/clients')
      .then(res => setClients(res.data))
      .catch(() => setError('Could not load clients'));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Select a Client</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <ClientCarousel clients={clients} />
    </div>
  );
}
