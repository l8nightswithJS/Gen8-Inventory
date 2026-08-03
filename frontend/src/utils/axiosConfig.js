import axios from 'axios';
import { getToken, isTokenValid, setToken } from './auth';

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
  timeout: 90000,
  withCredentials: false,
});

let refreshPromise = null;

async function refreshSessionToken() {
  const currentToken = getToken();
  if (!currentToken) {
    throw new Error('No session token is available to refresh.');
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${baseURL}/api/auth/refresh`,
        {},
        {
          timeout: 90000,
          withCredentials: false,
          headers: {
            Authorization: currentToken.startsWith('Bearer ')
              ? currentToken
              : `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        },
      )
      .then(({ data }) => {
        if (!isTokenValid(data?.token)) {
          throw new Error('The refreshed session token is invalid.');
        }

        setToken(data.token);
        localStorage.setItem('role', data.user?.role || '');
        return data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config || {};
    const status = error?.response?.status;
    const responseMessage =
      error?.response?.data?.error || error?.response?.data?.message || '';
    const isClientScopeDenial =
      status === 403 && /client|scope/i.test(String(responseMessage));
    const isAuthRequest = String(config.url || '').includes('/api/auth/');

    if (
      isClientScopeDenial &&
      !isAuthRequest &&
      !config._sessionRefreshAttempt
    ) {
      config._sessionRefreshAttempt = true;

      try {
        const refreshedToken = await refreshSessionToken();
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${refreshedToken}`;
        return api.request(config);
      } catch (refreshError) {
        console.error('❌ Session scope refresh failed:', {
          status: refreshError?.response?.status,
          responseData: refreshError?.response?.data,
          message: refreshError?.message,
        });
      }
    }

    const silent = config.meta && config.meta.silent;
    if (!silent) {
      console.error('❌ API error:', {
        url: config.url,
        method: config.method,
        status,
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
