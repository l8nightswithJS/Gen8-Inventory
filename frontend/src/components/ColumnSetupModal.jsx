// frontend/src/components/ColumnSetupModal.jsx (Corrected)
import { useState } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import { getCanonicalKey, normalizeKey } from '../utils/columnMapper'; // ✅ Import our new helper

export default function ColumnSetupModal({
  isOpen,
  onClose,
  onSave,
  initial = [],
}) {
  const [cols, setCols] = useState(
    initial.length
      ? initial
      : [
          'part_number',
          'name',
          'description',
          'lot_number',
          'barcode',
          'total_quantity',
        ],
  );
  const [input, setInput] = useState('');

  const addCol = () => {
    // ✅ MODIFIED: Use the intelligent mapper to find the correct key
    const k = getCanonicalKey(input);

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
            placeholder="Add column (e.g., Bar Code)"
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
              {c.replace(/_/g, ' ')}
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
            <p className="text-gray-500 p-2 italic">No columns defined.</p>
          )}
        </div>
        <div className="border-t pt-3 text-xs text-gray-500">
          <p>
            You can add core columns (like &apos;Part #&apos; or
            &apos;Barcode&apos;) or your own custom columns.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
