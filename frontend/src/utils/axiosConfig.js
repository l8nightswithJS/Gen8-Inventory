import axios from 'axios';

const instance = axios.create({
  // fallback to localhost:8000 if REACT_APP_API_URL isn’t defined
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000'
});

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default instance;
