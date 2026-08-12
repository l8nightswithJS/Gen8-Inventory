// frontend/src/utils/axiosConfig.js (Corrected)
import axios from 'axios';
import { getToken } from './auth';

// Point to the API gateway. Use the deployment environment in production
// and the local gateway during development.
const baseURL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : null);

console.log('🔎 Axios Base URL:', baseURL);
console.log('🔎 NODE_ENV:', process.env.NODE_ENV);
console.log('🔎 REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);

if (!baseURL) {
  throw new Error(
    '❌ Missing REACT_APP_API_BASE_URL. Define it in the frontend environment.',
  );
}

const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: false,
});

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
