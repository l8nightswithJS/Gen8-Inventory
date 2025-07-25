import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiUsers, FiLogOut } from 'react-icons/fi'

const Navbar = () => {
  const nav = useNavigate(),
        { pathname } = useLocation(),
        token = localStorage.getItem('token'),
        role  = localStorage.getItem('role')

  return (
    <nav className="bg-white shadow-sm px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center sticky top-0 z-50">
      <Link to={token ? '/dashboard' : '/'} className="text-xl font-bold flex items-center gap-1">
        <span className="text-blue-600">Gener8</span><span className="text-green-500">Inventory</span>
      </Link>
      <div className="flex items-center space-x-2">
        {!token
          ? <Link to="/login" className="text-gray-700 hover:underline text-sm font-medium">Login</Link>
          : <>
              {role === 'admin' && pathname !== '/users' && (
                <button onClick={() => nav('/users')} className="flex items-center text-gray-700 hover:text-gray-900 p-2 sm:px-2 sm:py-1 sm:rounded transition">
                  <FiUsers className="text-lg"/><span className="hidden sm:inline ml-1 text-sm font-medium">Manage Users</span>
                </button>
              )}
              <button onClick={() => { localStorage.clear(); nav('/login') }} className="flex items-center text-gray-700 hover:text-gray-900 p-2 sm:px-2 sm:py-1 sm:rounded transition">
                <FiLogOut className="text-lg"/><span className="hidden sm:inline ml-1 text-sm font-medium">Logout</span>
              </button>
            </>
        }
      </div>
    </nav>
  )
}

export default Navbar
