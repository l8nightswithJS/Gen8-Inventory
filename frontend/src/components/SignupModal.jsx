import { useState } from 'react';
import api from '../utils/axiosConfig';
import Button from './ui/Button';
import BaseModal from './ui/BaseModal';

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
      setMsg(data.message || 'Signup successful!');
      setTimeout(() => {
        if (onClose) onClose();
      }, 2500);
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Signup failed. Please try again.';
      setMsg(`ERROR: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const getMsgClasses = () => {
    if (!msg) return '';
    return msg.startsWith('ERROR')
      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
  };

  const inputStyles =
    'w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Request Access"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="signup-form"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      }
    >
      <form id="signup-form" onSubmit={submit} className="space-y-4">
        {msg && (
          <div
            className={`text-center text-sm font-medium p-3 rounded-md ${getMsgClasses()}`}
          >
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
          className={inputStyles}
          disabled={loading}
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 6 chars)"
          required
          value={form.password}
          onChange={handleChange}
          className={inputStyles}
          autoComplete="new-password"
          disabled={loading}
        />
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className={inputStyles}
          disabled={loading}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </form>
    </BaseModal>
  );
}
