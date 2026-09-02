import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

/**
 * ProtectedRoute — guards authenticated routes.
 * Redirects to /login if no token, checks permissions if specified.
 */
const ProtectedRoute = ({ children, permission }) => {
  const { user, roles, isAuthenticated, hasPermission } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    const primaryRole = (roles && roles[0]) || (user?.roles && user.roles[0]) || 'USER';

    return (
      <div
        className="sirnik-page sirnik-grid-bg"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '75vh',
          padding: '2rem 1rem',
        }}
      >
        <div
          style={{
            background: 'rgba(8, 8, 8, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            padding: '2.5rem 2.75rem',
            maxWidth: '540px',
            width: '100%',
            borderRadius: '2px',
            position: 'relative',
          }}
        >
          {/* Top Status Telemetry Tag */}
          <div
            className="flex justify-between items-center mb-xl"
            style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              paddingBottom: '0.85rem',
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: '0.66rem',
                letterSpacing: '0.08em',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              ACCESS CONTROL · 403 FORBIDDEN
            </span>
            <span
              className="font-mono text-muted"
              style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}
            >
              ZERO-TRUST RBAC
            </span>
          </div>

          {/* Central Header */}
          <div className="text-center mb-xl">
            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                marginBottom: '0.4rem',
              }}
            >
              Access Restricted
            </h2>
            <p
              className="text-xs text-muted font-mono"
              style={{ lineHeight: 1.5, margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}
            >
              You do not have the required security clearance to perform this action or view this resource.
            </p>
          </div>

          {/* Security Telemetry Details Grid */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '2px',
              padding: '1rem 1.25rem',
              marginBottom: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono text-muted text-xs" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                REQUIRED PRIVILEGE:
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  padding: '0.15rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '2px',
                }}
              >
                {permission}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono text-muted text-xs" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                CURRENT CLEARANCE:
              </span>
              <span
                className="font-mono text-xs"
                style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)' }}
              >
                ROLE · {String(primaryRole).toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono text-muted text-xs" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                RESOURCE TARGET:
              </span>
              <span
                className="font-mono text-xs"
                style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)' }}
              >
                {location.pathname}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="sirnik-action-box-btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0.75rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              RETURN TO PREVIOUS VIEW
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
