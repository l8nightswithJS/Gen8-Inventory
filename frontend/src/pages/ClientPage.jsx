import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import InventoryTable from '../components/InventoryTable';
import InventoryForm from '../components/InventoryForm';
import BulkImport from '../components/BulkImport';
import SearchBar from '../components/SearchBar';

export default function ClientPage() {
  const { clientId } = useParams();
  const [client, setClient] = useState({});
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const loadClient = async () => {
    const res = await axios.get(`/api/clients/${clientId}`);
    setClient(res.data);
  };

  const loadItems = async (p = 1, q = searchTerm) => {
    const res = await axios.get('/api/items', {
      params: {
        client_id: clientId,
        page: p,
        q
      }
    });
    setItems(res.data.items);
    setTotalPages(res.data.totalPages);
    setPage(p);
  };

  const exportCSV = async () => {
  try {
    const res = await axios.get('/api/items/export', {
      params: { client_id: clientId },
      responseType: 'blob', // ⬅ important for binary file download
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const blob = new Blob([res.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-${clientId}-inventory.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('CSV download failed: ' + (err.response?.data?.message || 'Unknown error'));
  }
};


  useEffect(() => {
    loadClient();
    loadItems();
  }, [clientId]);

  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/dashboard">← Back</Link>
      <h2>{client.name}</h2>

      <SearchBar onSearch={(term) => {
        setSearchTerm(term);
        loadItems(1, term);
      }} />

      <button onClick={exportCSV} style={{ marginBottom: '1rem' }}>
        Export CSV
      </button>

      <InventoryTable
        items={items}
        page={page}
        totalPages={totalPages}
        onPage={(p) => loadItems(p)}
        refresh={() => loadItems(page)}
      />

      <InventoryForm clientId={clientId} refresh={() => loadItems(page)} />
      <BulkImport clientId={clientId} refresh={() => loadItems(page)} />
    </div>
  );
}
