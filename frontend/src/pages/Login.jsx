import React, { useState, useEffect } from 'react'
import { useNavigate }                from 'react-router-dom'
import axios                          from '../utils/axiosConfig'
import logoSvg                        from '../assets/logo.svg'

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
      localStorage.setItem('role', data.role)
      navigate('/dashboard')
    } catch {
      setError('Login failed')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel: softer gradient + branding */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-green-400 relative overflow-hidden">
        <div className="px-12 pt-16">
          {/* Transparent SVG logo */}
          <img src={logoSvg} alt="Gener8" className="h-10 mb-6" />
          <h2 className="text-white text-4xl font-extrabold leading-tight">
            Welcome to Gener8
          </h2>
          <p className="text-white mt-4 max-w-xs">
            Streamline your inventory with rock‑solid reliability and built‑in security.
          </p>
        </div>
      </div>

      {/* Right panel: lighter background */}
      <div className="flex flex-1 items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Log in to your account
          </h3>
          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-center">
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
                className="w-full border border-gray-300 px-4 py-2 rounded
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 px-4 py-2 rounded
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white
                         font-semibold py-2 rounded-full transition-transform
                         transform hover:scale-105"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
