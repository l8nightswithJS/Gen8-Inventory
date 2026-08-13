import axios from 'axios';
import { getToken, isTokenValid, setToken } from './auth';
import { printLocalZebraJobs } from './localZebraPrint';

const baseURL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : null);

if (!baseURL) {
  throw new Error(
    'Missing REACT_APP_API_BASE_URL. Define it in the frontend environment.',
  );
}

const api = axios.create({
  baseURL,
  timeout: 30000,
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
          timeout: 30000,
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
  async (response) => {
    if (response?.data?.print_mode === 'local_windows_spooler') {
      try {
        const localResult = await printLocalZebraJobs(response.data);
        response.data.local_print = localResult;
        if (localResult.count > 0) {
          response.data.message = localResult.printer_name
            ? `${localResult.count} label(s) printed on ${localResult.printer_name}.`
            : `${localResult.count} label(s) printed on the local Zebra printer.`;
        }
      } catch (localError) {
        const wrapped = new Error(localError?.message || 'Local Zebra printing failed.');
        wrapped.config = response.config;
        wrapped.response = {
          status: 503,
          data: { message: wrapped.message },
        };
        throw wrapped;
      }
    }
    return response;
  },
  async (error) => {
    const config = error?.config || {};
    const status = error?.response?.status;
    const responseData = error?.response?.data;

    if (
      responseData &&
      !responseData.message &&
      Array.isArray(responseData.errors)
    ) {
      const validationMessage = responseData.errors
        .map((entry) => entry?.message || entry?.msg)
        .filter(Boolean)
        .join(' ');

      if (validationMessage) responseData.message = validationMessage;
    }

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
      } catch {
        // The original request error is returned below; callers decide how to surface it.
      }
    }

    const silent = config.meta && config.meta.silent;
    if (!silent && process.env.NODE_ENV === 'development') {
      console.error('API request failed:', {
        url: config.url,
        method: config.method,
        status,
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

  const isInventoryImport = ['/api/items/import', '/api/items/bulk'].some(
    (path) => String(config.url || '').includes(path),
  );

  if (
    isInventoryImport &&
    config.data &&
    typeof config.data === 'object' &&
    !Array.isArray(config.data) &&
    config.data.template == null
  ) {
    const { template: _unusedTemplate, ...requestData } = config.data;
    config.data = requestData;
  }

  return config;
});

export default api;
