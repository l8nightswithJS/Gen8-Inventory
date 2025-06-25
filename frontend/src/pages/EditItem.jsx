import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import styles from '../styles/Form.module.css';

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    lot_number: '',
    quantity: '',
    location: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`http://localhost:8000/api/items/${id}`).then(res => {
      setForm(res.data);
    });
  }, [id]);

  const validateForm = () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return false;
    }
    if (!form.part_number.trim()) {
      setError('Part Number is required.');
      return false;
    }
    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty < 0) {
      setError('Quantity must be a valid non-negative number.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  try {
    await axios.put(`http://localhost:8000/api/items/${id}`, form);
    navigate('/dashboard');
  } catch (err) {
    if (err.response && err.response.status === 400) {
      setError(err.response.data.message);
    } else {
      setError('An error occurred. Try again.');
    }
  }
};

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit}>
        <h2>Edit Item</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" />
        <input value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} placeholder="Part Number" />
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" />
        <input value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })} placeholder="Lot Number" />
        <input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="Quantity" />
        <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location" />
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
          <button type="submit">Update</button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{ marginLeft: '1rem' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
