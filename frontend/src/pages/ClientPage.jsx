import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import InventoryTable from '../components/InventoryTable';
import InventoryForm from '../components/InventoryForm';
import BulkImport from '../components/BulkImport';
import axios from '../utils/axiosConfig';

export default function ClientPage() {
  const { clientId } = useParams();
  const [items, setItems] = useState([]);
  const [client, setClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchItems = async (pg = 1) => {
    const res = await axios.get(`http://localhost:8000/api/items?client_id=${clientId}&page=${pg}&limit=10`);
    setItems(res.data.items || []);
    setPage(res.data.page);
    setTotalPages(res.data.totalPages);
  };
  const fetchClient = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/clients/${clientId}`);
      setClient(res.data);
    } catch {
      setClient(null);
    }
  };

  useEffect(() => {
    fetchItems(page);
    fetchClient();
    // eslint-disable-next-line
  }, [clientId, page]);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{client?.name ? `${client.name} Inventory` : 'Inventory'}</h2>
      <button onClick={() => setShowForm(v => !v)} style={{ margin: '1rem 0', padding: '0.5rem 1rem', background: '#7000ff', color: '#fff', border: 'none', borderRadius: 4 }}>
        {showForm ? 'Close Form' : 'Add Item'}
      </button>
      {showForm && (
        <InventoryForm refresh={() => fetchItems(page)} clientId={clientId} />
      )}
      <BulkImport refresh={() => fetchItems(page)} clientId={clientId} />
      <InventoryTable
        items={items}
        refresh={() => fetchItems(page)}
        clientId={clientId}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        // role can also be passed if you need to restrict edit/delete
      />
    </div>
  );
}
