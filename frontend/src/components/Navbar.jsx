import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // If we're on /clients/:id or /clients/:id/..., build a working Alerts link.
  const match = pathname.match(/^\/clients\/(\d+)/);
  const alertsPath = match ? `/clients/${match[1]}/alerts` : '/dashboard';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-white to-slate-50 border-b backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        <div className="text-[18px] font-semibold tracking-tight">
          <span className="text-blue-600">Gener8</span> Inventory
        </div>

        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            to={alertsPath}
            className="px-2.5 py-1.5 rounded-md hover:bg-gray-100"
          >
            Alerts
          </Link>
          <Link
            to="/users"
            className="px-2.5 py-1.5 rounded-md hover:bg-gray-100"
          >
            Manage Users
          </Link>
          <button
            onClick={logout}
            className="px-2.5 py-1.5 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
