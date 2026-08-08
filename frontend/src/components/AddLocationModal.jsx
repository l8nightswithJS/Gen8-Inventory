import { useMemo, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const TYPE_OPTIONS = [
  ['shelf', 'Shelf'],
  ['bin', 'Bin / Position'],
  ['rack', 'Rack'],
  ['floor', 'Floor / Pallet Position'],
  ['other', 'Other'],
];

export default function AddLocationModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    code: '',
    description: '',
    location_type: 'shelf',
    zone: '',
    rack: '',
    shelf: '',
    bin_position: '',
    active: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedBarcode = useMemo(() => {
    const normalized = form.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    return normalized ? `G8L-${normalized}` : 'Generated after entering code';
  }, [form.code]);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/locations', form);
      await onSuccess?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create location.');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Warehouse Location"
      size="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="add-location-form" variant="primary" disabled={loading}>
            {loading ? 'Saving…' : 'Add Location'}
          </Button>
        </>
      }
    >
      <form id="add-location-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Location Code
            <input name="code" required value={form.code} onChange={change} placeholder="RA-S01-B01" className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Location Type
            <select name="location_type" value={form.location_type} onChange={change} className={`mt-1 ${input}`}>
              {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Zone
            <input name="zone" value={form.zone} onChange={change} placeholder="RESIN or WAREHOUSE" className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Rack
            <input name="rack" value={form.rack} onChange={change} placeholder="A or RA" className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Shelf
            <input name="shelf" value={form.shelf} onChange={change} placeholder="01" className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Bin / Position
            <input name="bin_position" value={form.bin_position} onChange={change} placeholder="01 (optional)" className={`mt-1 ${input}`} />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
          <input name="description" value={form.description} onChange={change} placeholder="Resin Rack A Shelf 01" className={`mt-1 ${input}`} />
        </label>

        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300">
          Location barcode will be generated automatically: <span className="font-mono font-semibold">{suggestedBarcode}</span>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" checked={form.active} onChange={change} />
          Active warehouse location
        </label>
      </form>
    </BaseModal>
  );
}
