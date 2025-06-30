// src/pages/EditItemPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import InventoryForm from '../components/InventoryForm';

export default function EditItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const { data } = await axios.get(`/api/items/${id}`);
        setItem(data);
      } catch (err) {
        setError('Failed to load item.');
      }
    };
    fetchItem();
  }, [id]);

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center text-gray-500">
        Loading item...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Edit Item</h2>
      <InventoryForm
        initialData={item}
        onSuccess={() => navigate(`/clients/${item.client_id}`)}
      />
    </div>
  );
}
