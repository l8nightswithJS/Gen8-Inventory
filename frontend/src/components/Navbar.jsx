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

  // Define the style for the active NavLink to keep the JSX clean
  const activeLinkStyle = {
    backgroundColor: '#2563eb', // This is Tailwind's blue-600
    color: 'white',
  };

  const navLinks = (
    <>
      <NavLink
        to={alertsPath}
        // Apply the active style conditionally
        style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
        className="block px-3 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-100 md:text-sm"
        onClick={() => setIsMenuOpen(false)}
      >
        Alerts
      </NavLink>
      <NavLink
        to="/users"
        style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
        className="block px-3 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-100 md:text-sm"
        onClick={() => setIsMenuOpen(false)}
      >
        Manage Users
      </NavLink>
      <button
        onClick={logout}
        className="block w-full px-3 py-2 text-base font-medium text-left text-gray-700 rounded-md hover:bg-gray-100 md:text-sm md:w-auto"
      >
        Logout
      </button>
    </>
  );

  return (
    // Add a subtle shadow for depth
    <header className="sticky top-0 z-30 bg-white/95 border-b border-slate-200 backdrop-blur shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Replace text-only brand with logo + text */}
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo192.png" alt="Gener8 Logo" className="h-8 w-8" />
          <div className="font-semibold text-lg text-blue-600">
            Gener8 <span className="text-slate-800">Inventory</span>
          </div>
        </Link>

        {/* This is the desktop navigation */}
        <nav className="hidden md:flex md:items-center md:gap-1">
          {navLinks}
        </nav>

        {/* This is the mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center justify-center p-2 text-gray-500 rounded-md hover:text-gray-600 hover:bg-gray-100"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className="sr-only">Open main menu</span>
            {isMenuOpen ? (
              <FiX className="block w-6 h-6" />
            ) : (
              <FiMenu className="block w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Add a shadow to the dropdown menu */}
      {isMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t shadow-lg">
          <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">{navLinks}</nav>
        </div>
      )}
    </header>
  );
}
