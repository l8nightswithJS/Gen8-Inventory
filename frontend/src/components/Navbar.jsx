import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiCamera } from 'react-icons/fi';

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const match = pathname.match(/^\/clients\/(\d+)/);
  const clientId = match ? match[1] : null;
  const alertsPath = clientId ? `/clients/${clientId}/alerts` : '/dashboard';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const onClientPage = Boolean(clientId);

  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        <div className="font-semibold">
          <span className="text-blue-600">Gener8</span> Inventory
        </div>

        <nav className="flex items-center gap-2 text-sm">
          {!onClientPage && (
            <NavLink
              to="/scan"
              className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 font-medium hover:bg-gray-50"
            >
              <FiCamera className="text-base" />
              <span>Scan</span>
            </NavLink>
          )}

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
            className="px-2.5 py-1.5 rounded-md hover:bg-gray-100"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
