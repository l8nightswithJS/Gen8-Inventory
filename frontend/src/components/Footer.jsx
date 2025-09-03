// frontend/src/components/Footer.jsx
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { href: '/how-to', text: 'How-to Guide' },
    { href: '/feedback', text: 'Feedback' },
    { href: '/support', text: 'Support' },
    { href: '/status', text: 'System Status' }, // ✅ dedicated route
  ];

  const legalLinks = [
    { href: '/terms', text: 'Terms' },
    { href: '/privacy', text: 'Privacy' },
  ];

  const allLinks = [...links, ...legalLinks];

  return (
    <footer className="bg-slate-100 border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        {/* Mobile Layout: Stacked */}
        <div className="sm:hidden text-center">
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            {allLinks.map((link) => (
              <Link
                key={link.text}
                to={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {link.text}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-gray-500 mt-4">
            © {year} Gener8 Inventory, Inc.
          </p>
        </div>

        {/* Desktop Layout: Horizontal */}
        <div className="hidden sm:flex items-center justify-between">
          <p className="text-sm text-gray-500">
            © {year} Gener8 Inventory, Inc. All rights reserved.
          </p>
          <nav
            aria-label="Footer navigation"
            className="flex items-center gap-x-6"
          >
            {allLinks.map((link) => (
              <Link
                key={link.text}
                to={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {link.text}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
