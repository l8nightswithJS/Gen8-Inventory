import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', {
        username,
        password
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);

      console.log('Stored role:', res.data.role);

      setTimeout(() => navigate('/dashboard'), 100);
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '10px' }}>
      <h2 style={{ textAlign: 'center' }}>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#333', color: 'white', border: 'none', borderRadius: '5px' }}>
          Login
        </button>
      </form>
    </div>
  );
}
