import { useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/auth';
import Button from './ui/Button';
import { FiLogOut } from 'react-icons/fi';

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  return (
    <Button
      onClick={handleLogout}
      size="sm"
      variant="secondary"
      aria-label="Logout"
      leftIcon={FiLogOut}
    >
      Logout
    </Button>
  );
}
