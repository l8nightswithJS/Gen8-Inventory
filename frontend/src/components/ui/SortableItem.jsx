// frontend/src/components/ui/SortableItem.jsx (New File)
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiGrid } from 'react-icons/fi';

export function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center"
    >
      <span className="cursor-grab p-1 text-gray-400" title="Drag to reorder">
        <FiGrid />
      </span>
      {children}
    </div>
  );
}
