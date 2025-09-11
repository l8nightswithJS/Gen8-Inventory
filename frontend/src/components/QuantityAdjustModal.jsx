// In frontend/src/components/QuantityAdjustModal.jsx (a new file)
import { useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export default function QuantityAdjustModal({
  item,
  location,
  onClose,
  onSuccess,
}) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !quantity) return;

    setLoading(true);
    setError('');
    try {
      // This calls the atomic update endpoint we built
      await api.post('/api/inventory/adjust', {
        item_id: item.id,
        location_id: location.id,
        change_quantity: Number(quantity),
      });
      onSuccess(); // This will trigger a data refresh on the main page
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust inventory.');
    } finally {
      setLoading(false);
    }
  };

  const itemName =
    item.attributes?.name || item.attributes?.part_number || `Item #${item.id}`;
  const Footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="adjust-qty-form"
        variant="primary"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Adjust Inventory'}
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={`Adjust Stock for: ${itemName}`}
      footer={Footer}
    >
      <form id="adjust-qty-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-sm text-gray-600">
          At Location: <span className="font-semibold">{location.code}</span>
        </p>
        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Quantity to Add / Remove
          </label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Use a positive number (e.g., 5) to add stock, or a negative number
            (e.g., -1) to remove stock.
          </p>
        </div>
      </form>
    </BaseModal>
  );
}
