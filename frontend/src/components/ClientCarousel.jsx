import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditClientModal from './EditClientModal';
import ConfirmModal from './ConfirmModal';

export default function ClientCarousel({ clients, onClientUpdated, onClientDeleted, onAddClient }) {
  const navigate = useNavigate();
  const carouselRef = useRef();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const scroll = (dir) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardW = el.firstChild ? el.firstChild.offsetWidth : 300;
    el.scrollBy({ left: dir * cardW * 1.2, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full" tabIndex="0" aria-label="Client carousel">
      {/* Scroll Buttons */}
      <button
        onClick={() => scroll(-1)}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 p-2 rounded-full z-10 shadow"
        aria-label="Scroll left"
      >
        ←
      </button>

      <div
        ref={carouselRef}
        className="flex overflow-x-auto px-10 py-4 space-x-4 scrollbar-hide"
      >
        {/* Add Client */}
        <div
          onClick={onAddClient}
          className="flex-shrink-0 w-60 sm:w-64 h-44 border-2 border-dashed border-gray-400 rounded-lg flex flex-col justify-center items-center cursor-pointer hover:bg-gray-50 transition"
        >
          <div className="text-4xl font-bold text-gray-600">+</div>
          <div className="text-sm text-gray-500 mt-1">Add Client</div>
        </div>

        {/* Clients */}
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex-shrink-0 w-60 sm:w-64 h-44 bg-white border rounded-lg shadow-md p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-center h-16">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={`${client.name} logo`}
                  className="h-full object-contain max-h-16"
                />
              ) : (
                <div className="text-sm text-gray-500">No Logo</div>
              )}
            </div>
            <div className="text-center font-semibold text-gray-700 truncate">{client.name}</div>
            <div className="flex justify-around mt-2">
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="text-sm text-blue-600 hover:underline"
              >
                Inventory
              </button>
              <button
                onClick={() => setEditing(client)}
                className="text-sm text-yellow-500 hover:text-yellow-600"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeleting(client)}
                className="text-sm text-red-500 hover:text-red-600"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll(1)}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 p-2 rounded-full z-10 shadow"
        aria-label="Scroll right"
      >
        →
      </button>

      {/* Edit Client Modal */}
      {editing && (
        <EditClientModal
          client={editing}
          onClose={() => setEditing(null)}
          onUpdated={(client) => {
            setEditing(null);
            onClientUpdated(client);
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      {deleting && (
        <ConfirmModal
          title={`Delete "${deleting.name}"?`}
          message="Are you sure? This cannot be undone."
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await onClientDeleted(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
