// frontend/src/utils/axiosConfig.js
import axios from 'axios';

// 1. DYNAMIC BASE URL: point to the GATEWAY (not the auth service).
// Uses env in prod; falls back to localhost gateway in dev.
const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

// All your original settings are preserved.
const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: false, // we're using Bearer tokens, not cookies
});

// 2. YOUR ROBUST TOKEN HANDLER: No changes needed here.
// Read token from storage (covers a few common keys)


// 3. YOUR REQUEST INTERCEPTOR: No changes needed here.
// It correctly attaches the Authorization header on every request.


// 4. YOUR RESPONSE INTERCEPTOR: No changes needed here.
// This provides excellent, detailed error logging.
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

    // Optional: auto-logout on 401 (uncomment if you want this behavior)
    // if (error?.response?.status === 401) {
    //   localStorage.clear(); // Clear all localStorage for safety
    //   sessionStorage.clear(); // Clear all sessionStorage
    //   window.location.assign('/login');
    // }

    return Promise.reject(error);
  },
);

export default api;


// Unified token handler
import { getToken } from './auth';

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
