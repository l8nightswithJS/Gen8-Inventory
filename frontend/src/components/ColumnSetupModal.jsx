import { useState } from 'react';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import { getCanonicalKey, normalizeKey } from '../utils/columnMapper';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addCol = () => {
    const k = getCanonicalKey(input);
    if (!k || cols.includes(k)) {
      setInput('');
      return;
    }
    setCols((prev) => [...prev, k]);
    setInput('');
  };

  const remove = (key) => {
    setCols((prev) => prev.filter((c) => c !== key));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addCol();
    }
  };

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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Setup Table Columns"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave(cols)}>
            Save Columns
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(normalizeKey(e.target.value))}
            onKeyPress={handleKeyPress}
            placeholder="Add column..."
            className="flex-1 border rounded px-3 py-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={addCol} variant="primary">
            Add
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cols} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 p-2 rounded-md border dark:border-slate-700 min-h-[12rem] max-h-96 overflow-y-auto">
              {cols.map((c) => (
                <SortableItem key={c} id={c}>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-medium w-full text-slate-800 dark:text-slate-200">
                    <span>{c.replace(/_/g, ' ')}</span>
                    <button
                      onClick={() => remove(c)}
                      className="ml-auto text-red-600 hover:text-red-800 font-bold"
                      title={`Remove ${c}`}
                    >
                      &times;
                    </button>
                  </div>
                </SortableItem>
              ))}
              {!cols.length && (
                <p className="text-gray-500 dark:text-slate-400 p-2 italic">
                  No columns defined.
                </p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </BaseModal>
  );
}
