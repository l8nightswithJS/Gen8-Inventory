import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ConfirmModal from '../components/ConfirmModal';
import UserForm from '../components/UserForm';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // You can keep your existing logic for admin detection
  const isAdmin = localStorage.getItem('role') === 'admin';

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, created_at')
        .order('id', { ascending: true });
      if (error) throw error;
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddClick = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);
      if (error) throw error;
      setShowConfirm(false);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
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

      <table className="w-full text-sm border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Username</th>
            <th className="border p-2 text-left">Role</th>
            {isAdmin && <th className="border p-2 text-left">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t">
              <td className="p-2">{user.username}</td>
              <td className="p-2 capitalize">{user.role}</td>
              {isAdmin && (
                <td className="p-2 space-x-3">
                  <button
                    onClick={() => handleEditClick(user)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setUserToDelete(user);
                      setShowConfirm(true);
                    }}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add/Edit User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg">
            <UserForm
              userToEdit={editingUser}
              onSuccess={() => {
                fetchUsers();
                setShowForm(false);
              }}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirm && userToDelete && (
        <ConfirmModal
          show={true}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleDelete}
          message={`Delete user "${userToDelete.username}"?`}
        />
      )}
    </div>
  );
}
