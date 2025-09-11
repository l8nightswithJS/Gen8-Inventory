import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import LogoutButton from './LogoutButton';

export default function Navbar() {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const match = pathname.match(/^\/clients\/(\d+)/);
  const clientId = match ? match[1] : null;

  // ADDED: Check if the current user is an admin
  const isAdmin = localStorage.getItem('role') === 'admin';

  const navLinks = (
    <>
      {clientId && (
        <NavLink
          to={`/clients/${clientId}/alerts`}
          className={({ isActive }) =>
            `block px-3 py-2 rounded-md transition-colors md:text-sm ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
          onClick={() => setIsMenuOpen(false)}
        >
          Alerts
        </NavLink>
      )}

      {/* ADDED: The new NavLink for the Master View, visible only to admins */}
      {isAdmin && (
        <NavLink
          to="/inventory/master"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-md transition-colors md:text-sm ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
          onClick={() => setIsMenuOpen(false)}
        >
          Master View
        </NavLink>
      )}

      <NavLink
        to="/users"
        className={({ isActive }) =>
          `block px-3 py-2 rounded-md transition-colors md:text-sm ${
            isActive
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`
        }
        onClick={() => setIsMenuOpen(false)}
      >
        Manage Users
      </NavLink>
      <div className="px-3 py-2">
        <LogoutButton />
      </div>
    </>
  );

  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b border-slate-200 backdrop-blur shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo192.png" alt="Gener8 Logo" className="h-8 w-8" />
          <div className="font-semibold text-lg text-blue-600">
            Gener8 <span className="text-slate-800">Inventory</span>
          </div>
        </Link>

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
            <span className="sr-only">Open main menu</span>
            {isMenuOpen ? (
              <FiX className="block w-6 h-6" />
            ) : (
              <FiMenu className="block w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t shadow-lg">
          <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">{navLinks}</nav>
        </div>
      )}
    </header>
  );
}
