import React, { useEffect, useState } from 'react'
import ClientCarousel                  from '../components/ClientCarousel'
import AddClientModal                  from '../components/AddClientModal'
import { supabase }                    from '../lib/supabaseClient'

export default function Dashboard() {
  const [clients, setClients]           = useState([])
  const [error, setError]               = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('id', { ascending: false })
      if (error) throw error
      setClients(data)
    } catch {
      setError('Could not load clients')
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-screen-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Projects Dashboard</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <ClientCarousel
        clients={clients}
        onClientDeleted={async (id) => {
          await supabase.from('clients').delete().eq('id', id)
          fetchClients()
        }}
        onClientUpdated={fetchClients}
        onAddClient={() => setShowAddModal(true)}
      />

      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onClientAdded={() => {
          fetchClients()
          setShowAddModal(false)
        }}
      />
    </div>
  )
}
