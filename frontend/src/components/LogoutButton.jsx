import { clearToken } from '../utils/auth';
// frontend/src/components/LogoutButton.jsx
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    
    navigate('/');
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '0.5rem 1rem',
        background: '#e63946',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
      }}
    >
      Logout
    </button>
  );
}
