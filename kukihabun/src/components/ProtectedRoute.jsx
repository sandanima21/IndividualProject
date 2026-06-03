import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';

/**
 * Wraps a route so only authenticated users can access it.
 *
 * Props:
 *   roles  – optional array of allowed role strings (e.g. ['DELIVERY']).
 *            When omitted, any authenticated user is allowed.
 *
 * Unauthenticated users are sent to /signin with the intended path stored
 * in location.state.from so SignIn can redirect back after login.
 * Users with the wrong role are sent to /.
 */
const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useContext(StoreContext);
  const location = useLocation();

  if (!user || !token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
