// src/pages/Login.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../utils/axiosConfig'

// same helper for login page
function isTokenValid(token) {
  if (!token) return false
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]))
    return typeof exp === 'number' && Date.now() < exp * 1000
  } catch {
    return false
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  // redirect if already logged in (and clear stale if expired)
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (isTokenValid(token)) {
      navigate('/dashboard', { replace: true })
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
    }
  }, [navigate])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    try {
      const { data } = await axios.post('/api/auth/login', { username, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('role',  data.role)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 overflow-hidden">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-6">
          Login
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-full transition-transform transform hover:scale-105"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
