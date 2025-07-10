import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');

  if (location.pathname === '/login') return null;

  return (
    <nav className="bg-gray-800 text-white px-4 py-3 shadow-md flex flex-wrap justify-between items-center">
      <Link to="/dashboard" className="text-lg md:text-xl font-bold text-white hover:text-gray-300">
        <span className="text-white">Gener8</span> <span className="text-blue-400">Inventory</span>
      </Link>

      <div className="flex space-x-2 mt-2 md:mt-0">
        {role === 'admin' && location.pathname !== '/users' && (
          <button
            onClick={() => navigate('/users')}
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded"
          >
            Manage Users
          </button>
        )}
        <button
          onClick={() => {
            localStorage.clear();
            navigate('/login');
          }}
          className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
