import { useEffect, useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const TYPE_OPTIONS = [
  ['staging', 'Staging'],
  ['shelf', 'Shelf'],
  ['bin', 'Bin / Position'],
  ['rack', 'Rack'],
  ['floor', 'Floor / Pallet Position'],
  ['other', 'Other'],
];

export default function EditLocationModal({ location, isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({
      code: location?.code || '',
      description: location?.description || '',
      barcode: location?.barcode || '',
      location_type: location?.location_type || 'other',
      zone: location?.zone || '',
      rack: location?.rack || '',
      shelf: location?.shelf || '',
      bin_position: location?.bin_position || '',
      active: location?.active !== false,
    });
    setError('');
  }, [location]);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.put(`/api/locations/${location.id}`, form);
      await onSuccess?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update location.');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white';
  const system = location?.is_system === true;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Location: ${location?.code || ''}`}
      size="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="edit-location-form" variant="primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save Location'}
          </Button>
        </>
      }
    >
      <form id="edit-location-form" onSubmit={submit} className="space-y-4">
        {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>}

        {system && (
          <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300">
            This is a protected system location. Its code and barcode are permanent.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Location Code
            <input name="code" required value={form.code || ''} onChange={change} disabled={system} className={`mt-1 ${input} disabled:opacity-60`} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Location Type
            <select name="location_type" value={form.location_type || 'other'} onChange={change} className={`mt-1 ${input}`}>
              {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Zone
            <input name="zone" value={form.zone || ''} onChange={change} className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Rack
            <input name="rack" value={form.rack || ''} onChange={change} className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Shelf
            <input name="shelf" value={form.shelf || ''} onChange={change} className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Bin / Position
            <input name="bin_position" value={form.bin_position || ''} onChange={change} className={`mt-1 ${input}`} />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
          <input name="description" value={form.description || ''} onChange={change} className={`mt-1 ${input}`} />
        </label>

        <div className="rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs font-semibold uppercase text-slate-500">Location Barcode</p>
          <p className="mt-1 font-mono font-semibold text-slate-900 dark:text-white">{form.barcode || 'Generated automatically'}</p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" checked={form.active !== false} onChange={change} disabled={system} />
          Active warehouse location
        </label>
      </form>
    </BaseModal>
  );
}
