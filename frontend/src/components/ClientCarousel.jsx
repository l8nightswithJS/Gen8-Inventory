// src/components/ClientCarousel.jsx
import React, { useRef, useState, useEffect } from 'react'
import { useNavigate }                      from 'react-router-dom'
import EditClientModal                      from './EditClientModal'
import ConfirmModal                         from './ConfirmModal'

export default function ClientCarousel({
  clients,
  onClientUpdated,
  onClientDeleted,
  onAddClient,
}) {
  const navigate = useNavigate()
  const carouselRef = useRef()

  // Re‑add editing/deleting state
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  // track portrait vs. landscape
  const [isPortrait, setIsPortrait] = useState(
    window.matchMedia('(orientation: portrait)').matches
  )
  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)')
    const handler = e => setIsPortrait(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // helper to build API URL for logos
  const resolveLogo = path => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    const base = process.env.REACT_APP_API_URL || 'http://localhost:8000'
    return `${base}${path}`
  }

  // choose container classes based on orientation
  const containerClasses = isPortrait
    ? 'flex flex-col space-y-4 overflow-y-auto px-4 py-4'
    : 'flex overflow-x-auto space-x-4 scrollbar-thin scrollbar-thumb-gray-400 px-4 py-4'

  return (
    <div className="relative h-full">
      <div
        ref={carouselRef}
        className={containerClasses}
        aria-label="Client carousel"
      >
        {/* Add Client tile */}
        <div
          onClick={onAddClient}
          className="snap-start flex-shrink-0 w-64 h-40 border-2 border-dashed
                     border-gray-400 rounded-lg flex flex-col items-center justify-center
                     cursor-pointer hover:bg-gray-50 transition"
        >
          <div className="text-4xl text-gray-600">+</div>
          <div className="mt-1 text-sm text-gray-500">Add Client</div>
        </div>

        {/* Client cards */}
        {clients.map(c => (
          <div
            key={c.id}
            className="snap-start flex-shrink-0 w-64 h-40 bg-white border
                       rounded-lg shadow p-4 flex flex-col justify-between"
          >
            <div className="h-24 flex items-center justify-center bg-gray-50 rounded">
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

            <h3 className="mt-2 text-center font-semibold text-gray-700 truncate">
              {c.name}
            </h3>

            <div className="flex justify-around mt-2">
              <button
                onClick={() => navigate(`/clients/${c.id}`)}
                className="text-blue-600 hover:underline text-sm"
              >
                Inventory
              </button>
              <button
                onClick={() => setEditing(c)}
                className="text-gray-600 hover:text-gray-800 text-sm"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeleting(c)}
                className="text-gray-600 hover:text-gray-800 text-sm"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Client Modal */}
      {editing && (
        <EditClientModal
          client={editing}
          onClose={() => setEditing(null)}
          onUpdated={c => {
            setEditing(null)
            onClientUpdated(c)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <ConfirmModal
          title={`Delete "${deleting.name}"?`}
          message="Are you sure? This cannot be undone."
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await onClientDeleted(deleting.id)
            setDeleting(null)
          }}
        />
      )}
    </div>
  )
}
