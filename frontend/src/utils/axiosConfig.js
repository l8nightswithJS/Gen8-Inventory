// src/utils/axiosConfig.js
import axios from 'axios';

// In dev this will be undefined so we fall back to localhost:8000.
// In production Vercel you must define REACT_APP_API_URL to be your live API.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const instance = axios.create({
  baseURL: API_URL,
});

// attach stored token (if any) to every request
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default instance;
