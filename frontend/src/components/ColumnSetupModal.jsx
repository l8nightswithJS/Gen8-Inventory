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

const DEFAULT_COLUMNS = [
  'part_number',
  'name',
  'description',
  'lot_number',
  'inventory_location',
  'total_quantity',
  'uom',
  'status',
];

const COLUMN_LABELS = {
  part_number: 'Part Number',
  lot_number: 'Lot Number',
  inventory_location: 'Location',
  total_quantity: 'On Hand',
  uom: 'Unit of Measure',
  status: 'Status',
  barcode: 'Internal Barcode',
  vendor_barcode: 'Vendor Barcode',
  reorder_level: 'Reorder Level',
  low_stock_threshold: 'Low-Stock Threshold',
};

const displayColumn = (column) =>
  COLUMN_LABELS[column] ||
  column.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function ColumnSetupModal({
  isOpen,
  onClose,
  onSave,
  initial = [],
}) {
  const [cols, setCols] = useState(initial.length ? initial : DEFAULT_COLUMNS);
  const [input, setInput] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addColumn = () => {
    const key = getCanonicalKey(input);
    if (!key || cols.includes(key)) {
      setInput('');
      return;
    }
    setCols((previous) => [...previous, key]);
    setInput('');
  };

  const removeColumn = (key) => {
    setCols((previous) => previous.filter((column) => column !== key));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addColumn();
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCols((items) => {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
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
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(normalizeKey(event.target.value))}
              onKeyDown={handleKeyDown}
              placeholder="Add column..."
              className="flex-1 border rounded px-3 py-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={addColumn} variant="primary">
              Add
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Core fields such as Description remain available for molded parts,
            while client-specific attributes can be added as columns.
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cols} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 p-2 rounded-md border dark:border-slate-700 min-h-[12rem] max-h-96 overflow-y-auto">
              {cols.map((column) => (
                <SortableItem key={column} id={column}>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-medium w-full text-slate-800 dark:text-slate-200">
                    <span>{displayColumn(column)}</span>
                    <button
                      type="button"
                      onClick={() => removeColumn(column)}
                      className="ml-auto text-red-600 hover:text-red-800 font-bold"
                      title={`Remove ${displayColumn(column)}`}
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
