import { useState } from 'react';
import api from '../utils/axiosConfig';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const OPTIONS = [
  ['pending_inspection', 'Pending Inspection'],
  ['released', 'Released'],
  ['hold', 'Hold'],
  ['quarantine', 'Quarantine'],
  ['rejected', 'Rejected'],
];

export default function QualityStatusModal({ item, onClose, onUpdated }) {
  const [status, setStatus] = useState(item?.quality_status || 'released');
  const [notes, setNotes] = useState(item?.quality_notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const save = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/items/${item.id}/quality`, {
        quality_status: status,
        notes: notes.trim() || null,
      });
      await onUpdated?.();
      onClose?.();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to update quality status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={!!item}
      onClose={onClose}
      title="Quality Disposition"
      size="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="quality-status-form" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Quality Status'}
          </Button>
        </div>
      }
    >
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      <div className="mb-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
        <p className="font-semibold">{item.name || item.description || item.part_number}</p>
        <p className="font-mono text-xs text-slate-500">{item.barcode}</p>
        <p className="mt-1 text-sm text-slate-500">Part {item.part_number} · Lot {item.lot_number || 'N/A'}</p>
      </div>
      <form id="quality-status-form" onSubmit={save} className="space-y-4">
        <label className="block text-sm font-medium">
          Quality Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            {OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Inspection / Disposition Notes
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="AQL passed, receiving inspection complete, hold reason, NCR reference…"
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
        </label>
        <p className="text-xs text-slate-500">
          Quality status is separate from physical location. After release, scan the destination shelf and the G8I to put the container away.
        </p>
      </form>
    </BaseModal>
  );
}
