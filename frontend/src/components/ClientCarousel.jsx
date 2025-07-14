import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditClientModal from './EditClientModal';
import ConfirmModal from './ConfirmModal';

export default function ClientCarousel({
  clients,
  onClientUpdated,
  onClientDeleted,
  onAddClient,
}) {
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

  // Helper: resolve logo URL
  const resolveLogo = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // otherwise assume it’s served from your API under /uploads
    const base = process.env.REACT_APP_API_URL || '';
    return `${base}${path}`;
  };

  return (
    <div className="relative" tabIndex="0" aria-label="Client carousel">
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 p-2 rounded-full z-10"
        aria-label="Scroll left"
      >
        &#8592;
      </button>

      <div
        ref={carouselRef}
        className="flex overflow-x-auto space-x-4 px-12 py-4 scrollbar-thin scrollbar-thumb-gray-400"
      >
        {/* Add Client card */}
        <div
          onClick={onAddClient}
          className="flex-shrink-0 w-64 h-40 border-2 border-dashed border-gray-400 rounded-lg flex flex-col justify-center items-center cursor-pointer hover:bg-gray-50 transition"
        >
          <div className="text-4xl font-bold text-gray-600">+</div>
          <div className="text-sm text-gray-500 mt-1">Add Client</div>
        </div>

        {/* One card per client */}
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex-shrink-0 w-64 h-40 bg-white border rounded-lg shadow-md p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-center h-16 bg-gray-50 rounded">
              {client.logo_url ? (
                <img
                  src={resolveLogo(client.logo_url)}
                  alt={`${client.name} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-sm text-gray-400">No Logo</div>
              )}
            </div>
            <div className="text-center font-semibold text-gray-700 truncate">
              {client.name}
            </div>
            <div className="flex justify-around mt-2">
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="text-sm text-blue-600 hover:underline"
              >
                Inventory
              </button>
              <button
                onClick={() => setEditing(client)}
                className="text-sm text-gray-600 hover:text-gray-800"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeleting(client)}
                className="text-sm text-gray-600 hover:text-gray-800"
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
        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 p-2 rounded-full z-10"
        aria-label="Scroll right"
      >
        &#8594;
      </button>

      {/* Edit Modal */}
      {editing && (
        <EditClientModal
          client={editing}
          onClose={() => setEditing(null)}
          onUpdated={(c) => {
            setEditing(null);
            onClientUpdated(c);
          }}
        />
      )}

      {/* Delete Modal */}
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
