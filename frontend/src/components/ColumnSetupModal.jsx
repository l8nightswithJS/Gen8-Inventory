// frontend/src/components/ColumnSetupModal.jsx (Upgraded)
import { useState } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import { getCanonicalKey, normalizeKey } from '../utils/columnMapper';

// --- Drag and Drop Imports ---
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './ui/SortableItem';

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
    onSave(cols.map(normalizeKey).filter(Boolean));
  };

  // ✅ New handler for when a drag operation ends
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCols((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
            placeholder="Add column..."
            className="flex-1 border rounded px-3 py-2 border-gray-300"
          />
          <Button onClick={addCol} variant="primary">
            Add
          </Button>
        </div>

        {/* ✅ Wrap the list in DndContext and SortableContext */}
        <DndContext
          sensors={[]}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cols} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 p-2 rounded-md border min-h-[12rem]">
              {cols.map((c) => (
                <SortableItem key={c} id={c}>
                  <span className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded text-sm font-medium w-full">
                    {c.replace(/_/g, ' ')}
                    <button
                      onClick={() => remove(c)}
                      className="ml-auto text-red-600 hover:text-red-800 font-bold"
                      title={`Remove ${c}`}
                    >
                      &times;
                    </button>
                  </span>
                </SortableItem>
              ))}
              {!cols.length && (
                <p className="text-gray-500 p-2 italic">No columns defined.</p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </BaseModal>
  );
}
