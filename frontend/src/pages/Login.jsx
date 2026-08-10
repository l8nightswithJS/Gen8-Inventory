import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import logoSvg from '../assets/logo.svg';
import { FiLock, FiMail } from 'react-icons/fi';
import { clearToken, inspectToken, isTokenValid, setToken } from '../utils/auth';

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function requestLogin(email, password, onStatus) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { data } = await api.post(
        '/api/auth/login',
        { email, password },
        { timeout: 15000 },
      );
      return data;
    } catch (error) {
      const status = error?.response?.status;
      const retryable =
        !status || status >= 500 || error?.code === 'ECONNABORTED';

      if (retryable && attempt < 2) {
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isTokenValid(token)) navigate('/dashboard', { replace: true });
    else clearToken();
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
        throw new Error(`Invalid session token: ${tokenStatus.reason}.`);
      }

      setToken(loginData.token);
      localStorage.setItem('role', loginData.user?.role || '');
      localStorage.setItem(
        'client_access',
        JSON.stringify(loginData.user?.client_access || []),
      );
      localStorage.setItem(
        'user_email',
        loginData.user?.email || email.trim().toLowerCase(),
      );

      const firstName = String(
        loginData.user?.first_name || loginData.user?.display_name || '',
      ).trim();
      if (firstName) localStorage.setItem('displayName', firstName);
      else localStorage.removeItem('displayName');

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setStatus('');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="hidden bg-slate-900 p-12 text-white md:flex md:w-1/2 md:flex-col md:justify-between lg:w-2/5">
        <div>
          <div className="flex items-center gap-3">
            <img src={logoSvg} alt="" className="h-10 w-10" />
            <span className="text-2xl font-semibold text-blue-400">
              Gener8 <span className="text-white">Inventory</span>
            </span>
          </div>
          <h1 className="mt-10 text-4xl font-bold leading-tight">
            Inventory visibility.
            <br />
            <span className="text-blue-400">Built around your projects.</span>
          </h1>
          <p className="mt-5 max-w-md leading-7 text-slate-300">
            Secure access to the inventory scopes and tools assigned to your account.
          </p>
        </div>
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Gener8
        </p>
      </div>

      <main className="flex w-full flex-1 flex-col items-center justify-center bg-slate-50 p-5 dark:bg-slate-900 md:w-1/2 lg:w-3/5">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2 md:hidden">
            <img src={logoSvg} alt="" className="h-9 w-9" />
            <span className="text-xl font-semibold text-blue-600 dark:text-blue-400">
              Gener8{' '}
              <span className="text-slate-900 dark:text-white">Inventory</span>
            </span>
          </div>

          <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white">
            Sign in
          </h2>
          <p className="mt-2 text-center text-slate-500 dark:text-slate-400">
            Use your provisioned Gener8 Inventory account
          </p>

          {error && (
            <div
              role="alert"
              className="my-6 rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-center text-sm text-red-800 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-400"
            >
              {error}
            </div>
          )}

          {status && !error && (
            <div
              role="status"
              className="my-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-900/20 dark:text-blue-300"
            >
              {status}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <FiMail
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={submitting}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <FiLock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-12 w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? 'Connecting…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-7 space-y-2 text-center text-sm text-slate-600 dark:text-slate-400">
            <p>Need access or having trouble signing in?</p>
            <Link
              to="/help"
              className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Help & Support
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
