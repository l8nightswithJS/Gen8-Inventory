import { Navigate } from 'react-router-dom';
import { clearToken, isSessionExpired } from '../utils/auth';

export default function PrivateRoute({ children }) {
  if (isSessionExpired()) {
    clearToken();
    return <Navigate to="/login?reason=expired" replace />;
  }
  return children;
}
