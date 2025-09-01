// frontend/src/components/ColumnSetupModal.jsx
import { useState } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const normalizeKey = (str) =>
  (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');

export default function ColumnSetupModal({
  isOpen,
  onClose,
  onSave,
  initial = [],
}) {
  const [cols, setCols] = useState(
    initial.length
      ? initial
      : ['name', 'part_number', 'description', 'quantity', 'location'],
  );
  const [input, setInput] = useState('');

  const addCol = () => {
    const k = normalizeKey(input);
    if (!k || cols.includes(k)) {
      setInput('');
      return;
    }
    setCols([...cols, k]);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCol();
    }
  };

  const remove = (key) => setCols(cols.filter((c) => c !== key));

  const save = () => {
    const cleaned = cols.map(normalizeKey).filter(Boolean);
    onSave(cleaned);
  };

  const Footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={save}>
        Save Columns
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Define Table Columns"
      footer={Footer}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add column (e.g., vendor_sku)"
            className="flex-1 border rounded px-3 py-2 border-gray-300"
          />
          <Button onClick={addCol} variant="primary">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 p-2 rounded-md border min-h-[6rem]">
          {cols.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded text-sm font-medium"
            >
              {c}
              <button
                onClick={() => remove(c)}
                className="text-red-600 hover:text-red-800 font-bold"
                title={`Remove ${c}`}
              >
                &times;
              </button>
            </span>
          ))}
          {!cols.length && (
            <em className="text-gray-500 p-2">No columns defined.</em>
          )}
        </div>
        <div className="border-t pt-3 text-xs text-gray-500">
          <p>
            Note: Controls for lot numbers, thresholds, and alerts will always
            be available when editing an item, even if they are not included
            here.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
