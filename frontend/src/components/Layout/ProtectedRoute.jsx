import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

/**
 * ProtectedRoute — guards authenticated routes.
 * Redirects to /login if no token, checks permissions if specified.
 */
const ProtectedRoute = ({ children, permission }) => {
  const { isAuthenticated, hasPermission } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Access Denied</h3>
          <p className="empty-state-text mt-md">
            You don't have the required permission: <code>{permission}</code>
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
