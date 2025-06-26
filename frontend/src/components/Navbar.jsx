import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };
  const role = localStorage.getItem('role');

  // Hide navbar on login
  if (location.pathname === '/login') return null;

  return (
    <nav style={{
      background: '#222', color: '#fff', padding: '1rem',
      marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
      <div>
        <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.2rem', marginRight: '2rem' }}>
          Gener8 Inventory
        </Link>
      </div>
      <button onClick={handleLogout} style={{ background: '#f55', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem' }}>
        Logout
      </button>
      {role === 'admin' && (
        <button onClick={() => navigate('/users')} style={{ marginRight: 16 }}>
        Manage Users
        </button>
      )}
    </nav>
  );
}
