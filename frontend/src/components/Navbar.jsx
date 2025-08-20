// src/components/Navbar.jsx
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const match = pathname.match(/^\/clients\/(\d+)/);
  const clientId = match ? match[1] : null;
  const alertsPath = clientId ? `/clients/${clientId}/alerts` : '/dashboard';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const navLinks = (
    <>
      <NavLink
        to={alertsPath}
        className="block px-3 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-50 md:text-sm"
        onClick={() => setIsMenuOpen(false)}
      >
        Alerts
      </NavLink>
      <NavLink
        to="/users"
        className="block px-3 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-50 md:text-sm"
        onClick={() => setIsMenuOpen(false)}
      >
        Manage Users
      </NavLink>
      <button
        onClick={logout}
        className="block w-full px-3 py-2 text-base font-medium text-left text-gray-700 rounded-md hover:bg-gray-50 md:text-sm md:w-auto"
      >
        Logout
      </button>
    </>
  );

  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="font-semibold text-lg">
          <Link to="/dashboard" className="text-blue-600">
            Gener8 <span className="text-gray-800">Inventory</span>
          </Link>
        </div>

        <nav className="hidden md:flex md:items-center md:gap-1">
          {navLinks}
        </nav>

        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center justify-center p-2 text-gray-500 rounded-md hover:text-gray-600 hover:bg-gray-100"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? (
              <FiX className="block w-6 h-6" />
            ) : (
              <FiMenu className="block w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t">
          <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">{navLinks}</nav>
        </div>
      )}
    </header>
  );
}
