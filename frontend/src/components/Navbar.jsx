import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import LogoutButton from './LogoutButton';
import ThemeToggler from './ThemeToggler';

const navClass = ({ isActive }) =>
  `block rounded-md px-3 py-2 transition-colors md:text-sm ${
    isActive
      ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-slate-800 dark:text-white'
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-700 dark:hover:text-white'
  }`;

export default function Navbar() {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const match = pathname.match(/^\/clients\/(\d+)/);
  const clientId = match ? match[1] : null;
  const role = localStorage.getItem('role') || '';
  const isAdmin = role === 'admin';
  const canReceive = isAdmin || role === 'inventory_staff';
  const closeMenu = () => setIsMenuOpen(false);

  const navLinks = (
    <>
      <NavLink to="/dashboard" className={navClass} onClick={closeMenu}>Projects</NavLink>
      <NavLink to="/scan" className={navClass} onClick={closeMenu}>Scan</NavLink>

      {canReceive && (
        <NavLink to="/receiving" className={navClass} onClick={closeMenu}>Receiving</NavLink>
      )}

      {clientId && (
        <NavLink to={`/clients/${clientId}/alerts`} className={navClass} onClick={closeMenu}>Alerts</NavLink>
      )}

      {isAdmin && (
        <NavLink to="/inventory/master" className={navClass} onClick={closeMenu}>Master View</NavLink>
      )}
      {isAdmin && (
        <NavLink to="/users" className={navClass} onClick={closeMenu}>Manage Users</NavLink>
      )}
      {isAdmin && (
        <NavLink to="/locations" className={navClass} onClick={closeMenu}>Manage Locations</NavLink>
      )}

      <NavLink to="/help" className={navClass} onClick={closeMenu}>Help</NavLink>

      <div className="px-3 py-2 md:hidden"><LogoutButton /></div>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Gener8 Inventory projects">
          <img src="/logo192.png" alt="" className="h-8 w-8" />
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            Gener8 <span className="text-slate-800 dark:text-slate-200">Inventory</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navLinks}
          <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-2 dark:border-slate-700">
            <LogoutButton />
            <ThemeToggler />
          </div>
        </nav>

        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? 'Close main menu' : 'Open main menu'}
          >
            {isMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-menu" className="border-t border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <nav className="space-y-1 px-2 pb-3 pt-2 sm:px-3" aria-label="Mobile navigation">
            <div className="flex justify-end px-2 pb-2 pt-1"><ThemeToggler /></div>
            {navLinks}
          </nav>
        </div>
      )}
    </header>
  );
}
