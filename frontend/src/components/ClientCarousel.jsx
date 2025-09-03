// frontend/src/components/ClientCarousel.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import EditClientModal from './EditClientModal';
import ConfirmModal from './ConfirmModal';
import Button from './ui/Button';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function ClientCarousel({
  clients,
  onClientUpdated,
  onClientDeleted,
}) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const resolveLogo = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    // Always point to the API gateway
    const base =
      process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080';
    return `${base}${path}`;
  };

  const handleEditClick = (e, client) => {
    e.preventDefault();
    setEditing(client);
  };

  const handleDeleteClick = (e, client) => {
    e.preventDefault();
    setDeleting(client);
  };

  return (
    <div>
      {/* Changed xl:grid-cols-5 to xl:grid-cols-4 to make cards bigger on large screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {clients.map((c) => (
          <Link
            key={c.id}
            to={`/clients/${c.id}`}
            className="aspect-[4/3] bg-white border rounded-lg shadow-sm p-4 grid grid-rows-[1fr_auto] group transition hover:shadow-xl hover:border-blue-500 hover:-translate-y-1"
          >
            <div className="flex items-center justify-center bg-gray-50 rounded-md overflow-hidden p-2">
              {c.logo_url ? (
                <img
                  src={resolveLogo(c.logo_url)}
                  alt={`${c.name} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-sm">No Logo</span>
              )}
            </div>

            <div className="flex items-start justify-between pt-3">
              <h3 className="font-bold text-lg text-slate-800 line-clamp-2">
                {c.name}
              </h3>
              <div className="flex items-center gap-1 transition-opacity flex-shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100">
                <Button
                  onClick={(e) => handleEditClick(e, c)}
                  variant="ghost"
                  size="sm"
                  title="Edit"
                >
                  <FiEdit2 size={16} />
                </Button>
                <Button
                  onClick={(e) => handleDeleteClick(e, c)}
                  variant="ghost"
                  size="sm"
                  title="Delete"
                  className="text-rose-600 hover:text-rose-700"
                >
                  <FiTrash2 size={16} />
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {editing && (
        <EditClientModal
          client={editing}
          onClose={() => setEditing(null)}
          onUpdated={onClientUpdated}
        />
      )}
      {deleting && (
        <ConfirmModal
          title={`Delete "${deleting.name}"?`}
          message="All inventory items for this client will also be deleted. This cannot be undone."
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
