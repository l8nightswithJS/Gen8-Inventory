import { useState } from 'react';
import api from '../utils/axiosConfig';
import Button from './ui/Button';

export default function SignupModal({ onClose }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'staff',
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const { data } = await api.post(`/api/auth/register`, form);
      setMsg(data.message);
      setTimeout(onClose, 2500);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white p-6 sm:p-8 rounded-lg shadow-xl space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Request Access</h2>
        {msg && (
          <div className="text-center text-sm font-medium p-3 bg-slate-50 rounded-md">
            {msg}
          </div>
        )}

        <input
          name="email"
          type="email"
          placeholder="Email address"
          required
          value={form.email}
          onChange={handleChange}
          className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
          disabled={loading}
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 6 chars)"
          required
          value={form.password}
          onChange={handleChange}
          className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
          autoComplete="new-password"
          disabled={loading}
        />
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
          disabled={loading}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
