import React from 'react';

export default function UserTable({ users, onEdit, onDelete }) {
  return (
    <table border="1" cellPadding="8" style={{ marginTop: '1rem', width: '100%' }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Username</th>
          <th>Role</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.id}</td>
            <td>{u.username}</td>
            <td>{u.role}</td>
            <td>{new Date(u.created_at).toLocaleString()}</td>
            <td>
              <button onClick={() => onEdit(u)}>✏️</button>
              <button onClick={() => onDelete(u)} style={{ marginLeft: 8 }}>🗑️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
