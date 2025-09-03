// frontend/src/components/LogoutButton.jsx
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/auth';
import Button from './ui/Button';

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  return (
    <Button onClick={handleLogout} size="sm" aria-label="Logout">
      Logout
    </Button>
  );
}
