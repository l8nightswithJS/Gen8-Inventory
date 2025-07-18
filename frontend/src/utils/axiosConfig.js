// src/utils/axiosConfig.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const instance = axios.create({
  baseURL: API_URL,   // now comes from your env or falls back to localhost
});

// inject token
instance.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export default instance;
