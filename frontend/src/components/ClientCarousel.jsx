// src/components/ClientCarousel.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditClientModal from './EditClientModal';
import ConfirmModal from './ConfirmModal';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

export default function ClientCarousel({
  clients,
  onClientUpdated,
  onClientDeleted,
  onAddClient,
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const resolveLogo = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    return `${base}${path}`;
  };

  return (
    <div className="h-full w-full p-4">
      {/* Responsive Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* Add Client tile */}
        <button
          type="button"
          onClick={onAddClient}
          aria-label="Add new client"
          className="aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FiPlus className="h-10 w-10" />
          <span className="mt-1 font-semibold">Add Client</span>
        </button>

        {/* Client cards */}
        {clients.map((c) => (
          <div
            key={c.id}
            className="aspect-[4/3] bg-white border rounded-lg shadow-sm p-4 flex flex-col group"
          >
            <div className="h-2/3 flex items-center justify-center bg-gray-50 rounded-md overflow-hidden">
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
            <h3 className="mt-2 text-center font-semibold text-gray-800 truncate">
              {c.name}
            </h3>
            <div className="flex justify-around items-center mt-auto pt-2">
              <button
                onClick={() => navigate(`/clients/${c.id}`)}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Inventory
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(c)}
                  className="p-1 text-gray-500 hover:text-blue-600"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => setDeleting(c)}
                  className="p-1 text-gray-500 hover:text-red-600"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          </div>
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
