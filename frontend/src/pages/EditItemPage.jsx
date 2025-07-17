import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/Form.module.css';

export default function EditItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    part_number: '',
    description: '',
    lot_number: '',
    quantity: '',
    location: '',
    has_lot: false
  });
  const [error, setError] = useState('');

  // Fetch existing item on mount
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;

        setForm({
          name:        data.name         || '',
          part_number: data.part_number  || '',
          description: data.description  || '',
          lot_number:  data.lot_number   || '',
          quantity:    data.quantity != null ? String(data.quantity) : '',
          location:    data.location     || '',
          has_lot:     data.has_lot      || false
        });
      } catch {
        setError('Could not fetch item.');
      }
    })();
  }, [id]);

  // Basic validation
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

  // Handle form submission to update item
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        name:        form.name.trim(),
        part_number: form.part_number.trim(),
        description: form.description,
        lot_number:  form.has_lot ? form.lot_number : '',
        quantity:    parseInt(form.quantity, 10),
        location:    form.location,
        has_lot:     form.has_lot
      };

      const { error: updateError } = await supabase
        .from('items')
        .update(payload)
        .eq('id', id);

      if (updateError) throw updateError;
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'An error occurred. Try again.');
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit}>
        <h2>Edit Item</h2>
        {error && <p className="text-red-600">{error}</p>}
        <input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Name"
        />
        <input
          value={form.part_number}
          onChange={e => setForm({ ...form, part_number: e.target.value })}
          placeholder="Part Number"
        />
        <input
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
        />
        <input
          value={form.quantity}
          onChange={e => setForm({ ...form, quantity: e.target.value })}
          placeholder="Quantity"
        />
        <input
          value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
          placeholder="Location"
        />
        {form.has_lot && (
          <input
            value={form.lot_number || ''}
            onChange={e => setForm({ ...form, lot_number: e.target.value })}
            placeholder="Lot Number"
          />
        )}
        <div className="mt-4 flex gap-4">
          <button type="submit">Update</button>
          <button type="button" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
