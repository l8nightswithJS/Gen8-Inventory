import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const navigate                = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Use Supabase Auth instead of Axios
    const { data, error: signInError } = await supabase.auth.signIn({
      email: username,
      password
    });

    if (signInError) {
      setError('Invalid username or password');
      return;
    }

    // Persist the session client‑side
    if (data.session) {
      localStorage.setItem('supabase.session', JSON.stringify(data.session));
      // Optionally, you can fetch your application user (with role) here
      // and store it if needed.
    }

    // Redirect on success
    navigate('/dashboard');
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '4rem auto',
        padding: '2rem',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        borderRadius: '10px'
      }}
    >
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
        {error && <p style={{ color: 'red', marginBottom: '0.5rem' }}>{error}</p>}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}
