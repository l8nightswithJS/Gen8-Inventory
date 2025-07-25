import React from 'react'
import { Link, useNavigate, useLocation, useMatch } from 'react-router-dom'
import { FiUsers, FiLogOut } from 'react-icons/fi'

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const token = localStorage.getItem('token')
  const role  = localStorage.getItem('role')

  // show Alerts link only when inside /clients/:clientId/*
  const clientMatch = useMatch('/clients/:clientId/*')
  const clientId = clientMatch?.params.clientId

  return (
    <nav className="bg-white shadow-sm px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center sticky top-0 z-50">
      <Link
        to={token ? '/dashboard' : '/'}
        className="text-xl font-bold flex items-center gap-1"
      >
        <span className="text-blue-600">Gener8</span>
        <span className="text-green-500">Inventory</span>
      </Link>

      <div className="flex items-center space-x-2">
        {!token && (
          <Link
            to="/login"
            className="text-gray-700 hover:underline text-sm font-medium"
          >
            Login
          </Link>
        )}

        {token && clientId && (
          <Link
            to={`/clients/${clientId}/alerts`}
            className="text-gray-700 hover:text-gray-900 text-sm font-medium px-2"
          >
            Alerts
          </Link>
        )}

        {token && role === 'admin' && pathname !== '/users' && (
          <button
            onClick={() => navigate('/users')}
            className="flex items-center text-gray-700 hover:text-gray-900 p-2 sm:px-2 sm:py-1 sm:rounded transition"
          >
            <FiUsers className="text-lg" />
            <span className="hidden sm:inline ml-1 text-sm font-medium">
              Manage Users
            </span>
          </button>
        )}

        {token && (
          <button
            onClick={() => {
              localStorage.clear()
              navigate('/login')
            }}
            className="flex items-center text-gray-700 hover:text-gray-900 p-2 sm:px-2 sm:py-1 sm:rounded transition"
          >
            <FiLogOut className="text-lg" />
            <span className="hidden sm:inline ml-1 text-sm font-medium">
              Logout
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}
