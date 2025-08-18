// src/components/SignupModal.jsx
import { useState } from 'react';
import axios from '../utils/axiosConfig';

export default function SignupModal({ onClose }) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'staff',
  });
  const [msg, setMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const { data } = await axios.post('/api/auth/register', form);
      setMsg(data.message);
      // Automatically close after a successful request:
      setTimeout(onClose, 1500);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white p-6 sm:p-8 rounded-lg shadow-lg space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Request Access</h2>
        {msg && <div className="text-center text-green-700 text-sm">{msg}</div>}

        <input
          name="username"
          placeholder="Username"
          required
          value={form.username}
          onChange={handleChange}
          className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
        />

        <input
          name="password"
          type="password"
          placeholder="Password (min 6 chars)"
          required
          value={form.password}
          onChange={handleChange}
          className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
        />

        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded text-sm"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
