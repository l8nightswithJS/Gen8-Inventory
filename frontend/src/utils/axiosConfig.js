// src/utils/axiosConfig.js
import axios from 'axios';

const baseURL =
  process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: false, // we're using Bearer tokens, not cookies
});

// Read token from storage (covers a few common keys)
function getAuthToken() {
  return (
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('jwt') ||
    sessionStorage.getItem('jwt') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token') ||
    ''
  );
}

// Attach Authorization header on every request
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  } else if (config.headers && 'Authorization' in config.headers) {
    delete config.headers.Authorization;
  }
  return config;
});

// Keep console noise minimal; allow { meta: { silent: true } } to suppress logs
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const cfg = error?.config || {};
    const silent = cfg.meta && cfg.meta.silent;

    if (!silent) {
      console.error('❌ API error:', {
        url: cfg.url,
        method: cfg.method,
        status: error?.response?.status,
        responseData: error?.response?.data,
        headers: error?.response?.headers,
      });
    }

    // Optional: auto-logout on 401 (uncomment if you want this behavior)
    // if (error?.response?.status === 401) {
    //   localStorage.removeItem('token');
    //   sessionStorage.removeItem('token');
    //   window.location.assign('/login');
    // }

    return Promise.reject(error);
  },
);

export default api;
