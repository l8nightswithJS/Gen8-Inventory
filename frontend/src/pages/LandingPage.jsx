import { useState } from 'react';
import { Link } from 'react-router-dom';
import SignupModal from '../components/SignupModal';
import Button from '../components/ui/Button';
import logoG8 from '../assets/logog8.png';
import dashboardPreview from '../assets/dashboard-preview.png';

export default function LandingPage() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <div className="bg-slate-50 dark:bg-slate-900">
      <div className="relative bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 animate-gradient-xy overflow-hidden">
        <div className="container mx-auto px-6 sm:px-6 lg:px-8">
          <header className="relative py-6 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logoG8} alt="Gener8 Logo" className="h-8 w-8" />
              <div className="font-semibold text-lg text-blue-400">
                Gener8 <span className="text-white">Inventory</span>
              </div>
            </Link>
          </header>

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16 sm:py-24 lg:py-32">
            <div className="text-center lg:text-left">
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight opacity-0 animate-fade-in-up"
                style={{ animationDelay: '0.2s' }}
              >
                Manage your inventory with{' '}
                <span className="text-blue-400">confidence</span>.
              </h1>
              <p
                className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 opacity-0 animate-fade-in-up"
                style={{ animationDelay: '0.4s' }}
              >
                Streamline tracking of parts, clients, and users under one
                unified dashboard. Built for performance, designed for clarity.
              </p>
              <div
                className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start opacity-0 animate-fade-in-up"
                style={{ animationDelay: '0.6s' }}
              >
                <Button as={Link} to="/login" variant="primary" size="lg">
                  Get Started
                </Button>
                <Button
                  onClick={() => setShowSignup(true)}
                  variant="secondary"
                  size="lg"
                >
                  Sign Up
                </Button>
              </div>
              <p
                className="mt-6 text-sm text-slate-400 opacity-0 animate-fade-in-up"
                style={{ animationDelay: '0.8s' }}
              >
                The official inventory tool for all Gener8 projects.
              </p>
            </div>

            <div
              className="relative opacity-0 animate-fade-in hidden lg:block"
              style={{ animationDelay: '0.3s' }}
            >
              <div style={{ perspective: '1500px' }}>
                <div
                  className="bg-slate-800/60 rounded-xl shadow-2xl p-2"
                  style={{ transform: 'rotateY(-15deg) rotateX(5deg)' }}
                >
                  <div className="h-6 bg-slate-700 rounded-t-lg flex items-center px-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-600 mr-2"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-600 mr-2"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-600"></div>
                  </div>
                  <img
                    src={dashboardPreview}
                    alt="Application Dashboard Preview"
                    className="rounded-b-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full leading-[0]">
          <svg
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
            className="w-full h-auto text-slate-50 dark:text-slate-900"
            fill="currentColor"
          >
            <path d="M0,50 C480,100 960,0 1440,50 L1440,100 L0,100 Z"></path>
          </svg>
        </div>
      </div>

      <section className="py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
            Your App&apos;s Best Features
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            This is where you can add more sections to your landing page, like a
            list of key features, testimonials from users, or pricing
            information.
          </p>
        </div>
      </section>

      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
    </div>
  );
}
