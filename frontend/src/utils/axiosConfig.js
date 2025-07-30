// src/utils/axiosConfig.js
import axios from 'axios';

// In production (Vercel/etc) set REACT_APP_API_URL to your real backend URL,
// e.g. "https://gener8-inventory-api.onrender.com" (no trailing /api).
// Locally, we'll default to http://localhost:8000
const API_HOST = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const instance = axios.create({
  baseURL: `${API_HOST}`,     // <-- always prefix /api here
});

// Automatically attach your stored JWT on every request
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
