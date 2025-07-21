// src/pages/SplashPage.jsx
import React, { useState } from 'react';
import { Link }            from 'react-router-dom';
import axios                from '../utils/axiosConfig';
const logoSrc = 'https://www.gener8.net/wp-content/uploads/2023/02/logo.svg';

export default function SplashPage() {
  const [showSignup, setShowSignup] = useState(false);
  const [form, setForm] = useState({ username:'', password:'', role:'staff' });
  const [msg, setMsg]   = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({...f,[name]:value}));
  };

  const submit = async e => {
    e.preventDefault();
    setMsg('');
    try {
      const { data } = await axios.post('/api/auth/register', form);
      setMsg(data.message);
      setShowSignup(false);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">

      <main className="flex-grow flex flex-col items-center justify-center text-center px-6">
        <img src={logoSrc} alt="Gener8" className="h-28 mb-6 animate-pulse" />
        <h1 className="text-5xl font-extrabold mb-4">Manage your inventory the Gener8 way</h1>
        <p className="text-lg text-gray-600 mb-8">
          Track parts, clients, and users seamlessly.<br/>
          Fast setup, rock‑solid reliability, built‑in security.
        </p>
        <div className="flex gap-4">
          <Link to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full shadow-lg">
            Get Started
          </Link>
          <button
            onClick={()=>{ setShowSignup(s=>!s); setMsg(''); }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg"
          >
            Sign Up
          </button>
        </div>

        {showSignup && (
          <form
            onSubmit={submit}
            className="mt-8 bg-white p-6 rounded-lg shadow-lg max-w-md w-full space-y-4"
          >
            <h2 className="text-xl font-semibold">Request Access</h2>
            {msg && <div className="text-center text-green-700">{msg}</div>}
            <input
              name="username"
              placeholder="Username"
              required
              value={form.username}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
            <input
              name="password"
              type="password"
              placeholder="Password (min 6 chars)"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={()=>setShowSignup(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >Cancel</button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded"
              >Submit</button>
            </div>
          </form>
        )}
      </main>

      {/* footer banner */}
      
      <footer className="py-6 bg-gray-100 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Gener8 Inventory. All rights reserved.
      </footer>
    </div>
  );
}
