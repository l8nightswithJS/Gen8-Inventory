// src/components/Footer.jsx
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-600">
          {/* Left side: Logo */}
          <div className="flex-shrink-0">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-800 font-semibold"
            >
              {/* Make sure your logo is in the /public folder */}
              <img
                src="/frontend/src/assets/logo.svg"
                alt="Gener8 Logo"
                className="h-7 w-auto"
              />
              <span>Gener8 Inventory</span>
            </Link>
          </div>

          {/* Center: Quote (hidden on small screens) */}
          <div className="hidden md:block text-center">
            <p className="italic">
              &quot;Inventory accuracy is the hallmark of operational
              excellence.&quot;
            </p>
          </div>

          {/* Right side: Links and Copyright */}
          <div className="flex items-center gap-4">
            <a
              href="mailto:feedback@yourcompany.com"
              className="hover:underline"
            >
              Feedback
            </a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
