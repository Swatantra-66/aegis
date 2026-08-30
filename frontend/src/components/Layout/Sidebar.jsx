import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuthStore();
  const [time, setTime] = useState('');

  // Live Warsaw / UTC Telemetry Time
  useEffect(() => {
    const updateTime = () => {
      const formatted = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date());
      setTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/home', label: 'Home Page', index: '00' },
    { path: '/dashboard', label: 'Overview', index: '01' },
    { path: '/users', label: 'Identities', index: '02', permission: 'user:read' },
    { path: '/roles', label: 'Governance', index: '03', permission: 'role:read' },
    { path: '/audit', label: 'Audit Chain', index: '04', permission: 'audit:read' },
    { path: '/profile', label: 'Security', index: '05' },
    { path: '/sdlc', label: 'SDLC Staging', index: '06' },
  ];

  return (
    <aside className="sirnik-sidebar">
      {/* Logo */}
      <div>
        <NavLink to="/home" className="sirnik-logo">
          <div className="sirnik-logo-dot" />
          <span className="sirnik-logo-text">AEGIS / IAM</span>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="sirnik-nav-list">
        {navItems.map((item) => {
          if (item.permission && !hasPermission(item.permission)) return null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sirnik-link ${isActive ? 'active' : ''}`
              }
            >
              <div className="link-inner">
                <span>{item.index} · {item.label}</span>
                <span>{item.index} · {item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
        <div className="sirnik-meta mb-sm">
          <span>SYSTEM ACTIVE</span>
          <br />
          <span>UTC {time}</span>
        </div>

        {user && (
          <div className="sirnik-meta mb-md">
            <span style={{ color: '#fff', fontWeight: 600 }}>{user.email}</span>
          </div>
        )}

        <button onClick={handleLogout} className="sirnik-btn" style={{ fontSize: '0.8rem', padding: 0 }}>
          <span>DISCONNECT →</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
