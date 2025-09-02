// frontend/src/components/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';

/** ✅ Returns true if JWT exists and its `exp` claim is still in the future */
function isTokenValid(token) {
  if (!token) return false;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return typeof exp === 'number' && Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

export default function PrivateRoute({ children }) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (!isTokenValid(token)) {
    // clear any stale auth
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
