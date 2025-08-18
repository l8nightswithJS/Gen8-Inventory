// src/components/ClientCarousel.jsx
import { useRef, useState, useEffect } from 'react';
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
  const carouselRef = useRef(null);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [isPortrait, setIsPortrait] = useState(
    window.matchMedia('(orientation: portrait)').matches,
  );

  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)');
    const handler = (e) => setIsPortrait(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const resolveLogo = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    return `${base}${path}`;
  };

  const containerClasses = isPortrait
    ? 'flex flex-col space-y-4 overflow-y-auto px-4 py-4'
    : 'flex overflow-x-auto space-x-4 scrollbar-thin scrollbar-thumb-gray-400 px-4 py-4';

  return (
    <div className="relative h-full">
      <div
        ref={carouselRef}
        className={containerClasses}
        aria-label="Client carousel"
      >
        {/* Add Client tile (button for proper a11y) */}
        <button
          type="button"
          onClick={onAddClient}
          aria-label="Add client"
          className="snap-start flex-shrink-0 w-64 h-48 border-2 border-dashed
                     border-gray-400 rounded-lg flex flex-col items-center justify-center
                     hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="text-4xl text-gray-600">+</div>
          <div className="mt-1 text-sm text-gray-500">Add Client</div>
        </button>

        {/* Client cards */}
        {clients.map((c) => (
          <div
            key={c.id}
            className="snap-start flex-shrink-0 w-64 h-48 bg-white border
                       rounded-lg shadow p-4 flex flex-col"
          >
            <div className="h-24 flex items-center justify-center bg-gray-50 rounded">
              {c.logo_url ? (
                <img
                  src={resolveLogo(c.logo_url)}
                  alt={`${c.name} logo`}
                  className="h-20 max-w-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-sm">No Logo</span>
              )}
            </div>

            <h3 className="mt-1 text-center font-semibold text-gray-700 truncate">
              {c.name}
            </h3>

            <div className="flex justify-around mt-auto pt-2">
              <button
                type="button"
                onClick={() => navigate(`/clients/${c.id}`)}
                className="text-blue-600 hover:underline text-sm"
              >
                Inventory
              </button>
              <button
                type="button"
                onClick={() => setEditing(c)}
                className="text-gray-600 hover:text-gray-800 text-sm"
                title="Edit"
                aria-label={`Edit ${c.name}`}
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => setDeleting(c)}
                className="text-gray-600 hover:text-gray-800 text-sm"
                title="Delete"
                aria-label={`Delete ${c.name}`}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditClientModal
          client={editing}
          onClose={() => setEditing(null)}
          onUpdated={(updated) => {
            setEditing(null);
            onClientUpdated(updated);
          }}
        />
      )}

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
