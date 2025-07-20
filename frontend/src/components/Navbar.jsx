// src/components/Navbar.jsx
import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const token    = localStorage.getItem('token')    // your auth flag
  const role     = localStorage.getItem('role')     // "admin" or "staff"

  // never render on the login page
  if (location.pathname === '/login') return null

  return (
    <nav className="bg-gray-800 text-white px-4 py-3 shadow-md flex justify-between items-center">
      {/* Brand always goes to dashboard */}
      <Link
        to={ token ? '/dashboard' : '/' }
        className="text-lg font-bold hover:text-gray-300"
      >
        <span className="text-white">Gener8</span> <span className="text-blue-400">Inventory</span>
      </Link>

      <div className="flex space-x-2 items-center">
        {/* If not logged in, show Login */}
        {!token && (
          <Link
            to="/login"
            className="text-white font-semibold hover:text-gray-300"
          >
            Login
          </Link>
        )}

        {/* If logged in as admin, show Manage Users */}
        {token && role === 'admin' && location.pathname !== '/users' && (
          <button
            onClick={() => navigate('/users')}
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded"
          >
            Manage Users
          </button>
        )}

        {/* If logged in, show Logout */}
        {token && (
          <button
            onClick={() => {
              localStorage.clear()
              navigate('/login')
            }}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  )
}
