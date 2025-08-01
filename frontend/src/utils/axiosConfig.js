// src/utils/axiosConfig.js
import axios from 'axios';

const API_HOST = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const instance = axios.create({
  baseURL: API_HOST,
});

// attach JWT
instance.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// *** new: log every error response ***
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('❌ API error:', {
      url: err.config?.url,
      method: err.config?.method,
      status: err.response?.status,
      responseData: err.response?.data,
      headers: err.response?.headers,
      message: err.message,
    });
    return Promise.reject(err);
  },
);

export default instance;
