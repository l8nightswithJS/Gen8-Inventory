// src/pages/ClientPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from '../utils/axiosConfig'
import InventoryTable from '../components/InventoryTable'
import InventoryForm from '../components/InventoryForm'
import BulkImport from '../components/BulkImport'
import SearchBar from '../components/SearchBar'

export default function ClientPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const isAdmin = localStorage.getItem('role') === 'admin'

  const [client, setClient] = useState(null)
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showEdit, setShowEdit] = useState(false)

  // Fetch client details
  const fetchClient = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/clients/${clientId}`)
      setClient(data)
      setError('')
    } catch {
      setError('Unable to load client.')
    }
  }, [clientId])

  // Fetch items, always pull items from response.data
  const fetchItems = useCallback(async () => {
    try {
      const {
        data: { items },
      } = await axios.get('/api/items', {
        params: { client_id: clientId },
      })

      setItems(Array.isArray(items) ? items : [])
      setError('')
    } catch {
      setError('Unable to load items.')
      setItems([])
    }
  }, [clientId])

  useEffect(() => {
    fetchClient()
    fetchItems()
  }, [fetchClient, fetchItems])

  // Delete an item then refresh
  const handleDelete = async id => {
    if (!window.confirm('Delete this item?')) return
    try {
      await axios.delete(`/api/items/${id}`)
      fetchItems()
    } catch {
      alert('Failed to delete item.')
    }
  }

  // Always work on a safe array
  const safeItems = Array.isArray(items) ? items : []

  // Client‑side search
  const filtered = safeItems.filter(i =>
    `${i.name} ${i.part_number}`.toLowerCase().includes(query.toLowerCase())
  )

  const closeAllModals = () => {
    setShowAdd(false)
    setShowImport(false)
    setShowEdit(false)
    fetchItems()
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 hover:underline mr-4"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-semibold">
          {client?.name ?? 'Loading…'}
        </h2>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 mb-4 rounded border border-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between mb-4 space-y-2 sm:space-y-0">
        <SearchBar
          value={query}
          onSearch={q => setQuery(q)}
          className="w-full sm:w-auto"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              window.open(`/api/items/export?client_id=${clientId}`, '_blank')
            }
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm"
          >
            Export
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
              >
                + Add
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm"
              >
                Bulk
              </button>
            </>
          )}
        </div>
      </div>

      <InventoryTable
        items={filtered}
        onDelete={handleDelete}
        onEdit={item => {
          setEditItem(item)
          setShowEdit(true)
        }}
        role={isAdmin ? 'admin' : 'viewer'}
      />

      {filtered.length === 0 && !error && (
        <p className="text-center text-gray-500 mt-6">
          No inventory items found.
        </p>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded shadow-md max-w-2xl w-full mx-4 relative">
            <button
              onClick={() => setShowAdd(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              &times;
            </button>
            <InventoryForm
              clientId={clientId}
              onSuccess={closeAllModals}
              onClose={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded shadow-md max-w-3xl w-full mx-4 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowImport(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              &times;
            </button>
            <BulkImport
              clientId={clientId}
              refresh={closeAllModals}
              onClose={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEdit && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded shadow-md max-w-2xl w-full mx-4 relative">
            <button
              onClick={() => setShowEdit(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              &times;
            </button>
            <InventoryForm
              clientId={clientId}
              item={editItem}
              onSuccess={closeAllModals}
              onClose={() => setShowEdit(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
