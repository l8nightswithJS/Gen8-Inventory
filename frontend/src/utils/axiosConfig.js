// frontend/src/utils/axiosConfig.js (Corrected)
import axios from 'axios';
import { getToken } from './auth'; // ✅ MOVED TO THE TOP

// 1. DYNAMIC BASE URL: point to the GATEWAY (not the auth service).
// Uses env in prod; falls back to localhost gateway in dev.
const baseURL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : null);

// ✅ Add a debug log to confirm which baseURL is being used
console.log('🔎 Axios Base URL:', baseURL);
console.log('🔎 NODE_ENV:', process.env.NODE_ENV);
console.log('🔎 REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);

if (!baseURL) {
  throw new Error(
    '❌ Missing REACT_APP_API_BASE_URL. Define it in Vercel → Environment Variables.',
  );
}

const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: false, // we're using Bearer tokens, not cookies
});

// Response interceptor for error logging
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
      });
    }

    return Promise.reject(error);
  },
);

// Unified token handler
api.interceptors.request.use((config) => {
  const token = getToken();
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

export default api;
