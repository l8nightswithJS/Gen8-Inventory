// frontend/src/components/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { clearToken, isTokenValid } from '../utils/auth';

export default function PrivateRoute({ children }) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (!isTokenValid(token)) {
    if (typeof window !== 'undefined') {
      clearToken();
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
