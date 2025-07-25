// src/pages/UsersPage.jsx
import React, { useState, useEffect } from 'react'
import axios from '../utils/axiosConfig'
import ConfirmModal from '../components/ConfirmModal'
import UserForm     from '../components/UserForm'

export default function UsersPage() {
  const [users, setUsers]                 = useState([])
  const [showForm, setShowForm]           = useState(false)
  const [editingUser, setEditingUser]     = useState(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete]           = useState(null)

  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [userToApprove, setUserToApprove]           = useState(null)

  const [showDenyConfirm, setShowDenyConfirm] = useState(false)
  const [userToDeny,    setUserToDeny]        = useState(null)

  const isAdmin = localStorage.getItem('role') === 'admin'

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users')
      setUsers(res.data)
    } catch {
      console.error('Failed to fetch users')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAddClick = () => {
    setEditingUser(null)
    setShowForm(true)
  }
  const handleEditClick = (user) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/users/${userToDelete.id}`)
      setShowDeleteConfirm(false)
      setUserToDelete(null)
      fetchUsers()
    } catch {
      alert('Failed to delete user.')
    }
  }

  const handleApprove = async () => {
    try {
      // <— changed from /approved to /approve
      await axios.put(`/api/users/${userToApprove.id}/approve`)
      setShowApproveConfirm(false)
      setUserToApprove(null)
      fetchUsers()
    } catch {
      alert('Failed to approve user.')
    }
  }

  const handleDeny = async () => {
    try {
      await axios.delete(`/api/users/${userToDeny.id}`)
      setShowDenyConfirm(false)
      setUserToDeny(null)
      fetchUsers()
    } catch {
      alert('Failed to deny user.')
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Users</h2>
        {isAdmin && (
          <button
            onClick={handleAddClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            + Add User
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Username</th>
              <th className="border p-2 text-left">Role</th>
              {isAdmin && <th className="border p-2 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isPending = user.approved === false
              return (
                <tr
                  key={user.id}
                  className={`border-t ${
                    isAdmin && isPending
                      ? 'animate-pulse bg-red-50 border-red-300'
                      : ''
                  }`}
                >
                  <td className="p-2">{user.username}</td>
                  <td className="p-2 capitalize">{user.role}</td>
                  {isAdmin && (
                    <td className="p-2 space-x-3">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => {
                              setUserToApprove(user)
                              setShowApproveConfirm(true)
                            }}
                            className="text-green-700 hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setUserToDeny(user)
                              setShowDenyConfirm(true)
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Deny
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditClick(user)}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setUserToDelete(user)
                              setShowDeleteConfirm(true)
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* User form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 sm:mx-auto shadow-lg">
            <UserForm
              userToEdit={editingUser}
              onSuccess={() => {
                fetchUsers()
                setShowForm(false)
              }}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && userToDelete && (
        <ConfirmModal
          title="Delete User"
          message={`Delete "${userToDelete.username}"?`}
          cancelText="No"
          confirmText="Yes, Delete"
          variant="danger"
          onCancel={() => {
            setShowDeleteConfirm(false)
            setUserToDelete(null)
          }}
          onConfirm={handleDelete}
        />
      )}

      {/* Approve confirm */}
      {showApproveConfirm && userToApprove && (
        <ConfirmModal
          title="Approve User"
          message={`Approve "${userToApprove.username}"?`}
          cancelText="No"
          confirmText="Yes, Approve"
          variant="success"
          onCancel={() => {
            setShowApproveConfirm(false)
            setUserToApprove(null)
          }}
          onConfirm={handleApprove}
        />
      )}

      {/* Deny confirm */}
      {showDenyConfirm && userToDeny && (
        <ConfirmModal
          title="Deny User"
          message={`Deny "${userToDeny.username}"? This will delete their request.`}
          cancelText="No"
          confirmText="Yes, Deny"
          variant="danger"
          onCancel={() => {
            setShowDenyConfirm(false)
            setUserToDeny(null)
          }}
          onConfirm={handleDeny}
        />
      )}
    </div>
  )
}
