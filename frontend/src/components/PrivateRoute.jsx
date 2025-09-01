import { getToken, clearToken, isTokenValid } from '../utils/auth';
// frontend/src/components/PrivateRoute.jsx

import { Navigate } from 'react-router-dom';

/** Returns true if JWT exists and its `exp` claim is still in the future */
 = JSON.parse(atob(token.split('.')[1]));
    return typeof exp === 'number' && Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

export default function PrivateRoute({ children }) {
  const token = getToken();

  if (!isTokenValid(token)) {
    // clear any stale auth
    clearToken();
    
    return <Navigate to="/" replace />;
  }

  return children;
}
