import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import logoSvg from '../assets/logo.svg';
import SignupModal from '../components/SignupModal';
import { FiMail, FiLock } from 'react-icons/fi';
import {
  clearToken,
  inspectToken,
  isTokenValid,
  setToken,
} from '../utils/auth';

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function requestLogin(email, password, onStatus) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { data } = await api.post(
        '/api/auth/login',
        { email, password },
        { timeout: 15000 },
      );
      return data;
    } catch (error) {
      const status = error?.response?.status;
      const retryable = !status || status >= 500 || error?.code === 'ECONNABORTED';

      if (retryable && attempt < maxAttempts) {
        onStatus?.('Reconnecting…');
        await sleep(1000);
        continue;
      }

      throw new Error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Invalid email or password.',
      );
    }
  }

  throw new Error('The login service is temporarily unavailable.');
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isTokenValid(token)) {
      navigate('/dashboard', { replace: true });
    } else {
      clearToken();
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setError('');
    setStatus('Connecting…');
    setSubmitting(true);

    try {
      const loginData = await requestLogin(
        email.trim().toLowerCase(),
        password,
        setStatus,
      );

      const tokenStatus = inspectToken(loginData?.token);
      if (!tokenStatus.valid) {
        console.error('Session token validation failed:', {
          reason: tokenStatus.reason,
          responseKeys:
            loginData && typeof loginData === 'object'
              ? Object.keys(loginData)
              : [],
          tokenType: typeof loginData?.token,
          tokenSegments:
            typeof loginData?.token === 'string'
              ? loginData.token.split('.').length
              : 0,
          expiresAt: tokenStatus.expiresAt,
          now: tokenStatus.now,
        });
        throw new Error(`Invalid session token: ${tokenStatus.reason}.`);
      }

      setToken(loginData.token);
      localStorage.setItem('role', loginData.user?.role || '');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setStatus('');
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row">
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

        <div className="w-full md:w-1/2 lg:w-3/5 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white text-center">
              Welcome Back
            </h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mt-2">
              Sign in to continue
            </p>

            {error && (
              <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg my-6 text-center text-sm dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
                {error}
              </div>
            )}

            {status && !error && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg my-6 text-center text-sm dark:bg-blue-900/20 dark:border-blue-500/30 dark:text-blue-300">
                {status}
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
                  disabled={submitting}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
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
                  disabled={submitting}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  placeholder="Password"
                />
              </div>

              <div className="text-sm text-right">
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-wait"
              >
                {submitting ? 'Connecting…' : 'Sign In'}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setShowSignup(true)}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
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
