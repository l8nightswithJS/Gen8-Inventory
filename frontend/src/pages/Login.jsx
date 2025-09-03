// frontend/src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import logoSvg from '../assets/logo.svg';
import SignupModal from '../components/SignupModal';
import { FiMail, FiLock } from 'react-icons/fi';
import { clearToken } from '../utils/auth'; // ✅ centralize token clearing

function isTokenValid(token) {
  if (!token) return false;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return typeof exp === 'number' && Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isTokenValid(token)) {
      navigate('/dashboard', { replace: true });
    } else {
      clearToken(); // ✅ now consistent with Navbar, LogoutButton, IdleLogout, PrivateRoute
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user?.role || '');
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid email or password.');
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Left Panel */}
        <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-slate-900 text-white p-12 flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img src={logoSvg} alt="Gener8 Logo" className="h-10 w-10" />
              <span className="font-semibold text-2xl text-blue-400">
                Gener8 <span className="text-white">Inventory</span>
              </span>
            </div>
            <p className="mt-8 text-2xl font-light text-slate-300">
              “Inventory accuracy is the hallmark of operational excellence.”
            </p>
          </div>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Gener8, Inc.
          </p>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-1/2 lg:w-3/5 bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-extrabold text-slate-900 text-center">
              Welcome Back
            </h2>
            <p className="text-center text-slate-500 mt-2">
              Sign in to continue
            </p>

            {error && (
              <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg my-6 text-center text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="relative">
                <FiMail className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                />
              </div>

              <div className="relative">
                <FiLock className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Password"
                />
              </div>

              <div className="text-sm text-right">
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setShowSignup(true)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Request Access
              </button>
            </p>
          </div>
        </div>
      </div>

      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
    </>
  );
}
