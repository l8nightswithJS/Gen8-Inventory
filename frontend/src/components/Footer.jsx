// frontend/src/components/Footer.jsx
export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { href: '/how-to', text: 'How-to Guide' },
    { href: '/feedback', text: 'Feedback' },
    { href: '/support', text: 'Support' },
    { href: '#', text: 'System Status' },
  ];

  const legalLinks = [
    { href: '/terms', text: 'Terms' },
    { href: '/privacy', text: 'Privacy' },
  ];

  return (
    <footer className="bg-slate-100 border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        {/* Mobile Layout: Stacked */}
        <div className="sm:hidden text-center">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {links.map((link) => (
              <a
                key={link.text}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {link.text}
              </a>
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
          <nav className="flex items-center gap-x-6">
            {[...links, ...legalLinks].map((link) => (
              <a
                key={link.text}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {link.text}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
