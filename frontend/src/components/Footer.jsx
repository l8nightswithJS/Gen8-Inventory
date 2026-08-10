import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500 dark:text-slate-500">
          © {year} Gener8 Inventory
        </p>
        <nav aria-label="Support navigation" className="flex items-center gap-5">
          <Link to="/help" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white">
            Help & User Guide
          </Link>
          <Link to="/report-problem" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white">
            Report a Problem
          </Link>
        </nav>
      </div>
    </footer>
  );
}
