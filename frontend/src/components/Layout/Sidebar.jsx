import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import ShinyText from '../ShinyText';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, logout, hasPermission } = useAuthStore();
  const [time, setTime] = useState('');

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
    { path: '/home', label: 'Home' },
    { path: '/dashboard', label: 'Overview' },
    { path: '/users', label: 'Identities', permission: 'user:read' },
    { path: '/roles', label: 'Governance', permission: 'role:read' },
    { path: '/audit', label: 'Audit Chain', permission: 'audit:read' },
    { path: '/profile', label: 'Security' },
    { path: '/sdlc', label: 'SDLC' },
  ];

  const primaryRole = useMemo(() => {
    if (roles && roles.length > 0) {
      if (roles.includes('super_admin')) return 'SUPER ADMIN';
      if (roles.includes('admin')) return 'ADMIN';
      return roles[0].toUpperCase();
    }
    if (user?.roles && user.roles.length > 0) {
      const rNames = user.roles.map((r) => (typeof r === 'string' ? r : r.name || ''));
      if (rNames.some((r) => r.toLowerCase().includes('super_admin') || r.toLowerCase().includes('superadmin'))) {
        return 'SUPER ADMIN';
      }
      if (rNames.some((r) => r.toLowerCase().includes('admin'))) {
        return 'ADMIN';
      }
      return rNames[0]?.toUpperCase() || 'USER';
    }
    return 'USER';
  }, [user, roles]);

  const firstName = useMemo(() => {
    if (user?.first_name) return user.first_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  }, [user]);

  return (
    <aside
      className="sirnik-sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: '2.25rem 1.75rem',
      }}
    >
      {/* ── Top Group: Logo Branding & Navigation ── */}
      <div>
        <div
          style={{
            borderBottom: '1px solid var(--line)',
            paddingBottom: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <NavLink
            to="/home"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
            }}
          >
            <img
              src="/aegis-logo-new.png"
              alt="Aegis"
              style={{
                width: '28px',
                height: '28px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.25))',
              }}
            />
            <ShinyText
              text="AEGIS"
              fontSize={22}
              fontWeight={900}
              letterSpacing="0.08em"
              textColor="#ffffff"
              shadowColor="rgba(255, 255, 255, 0.3)"
              glareColor="rgba(255, 255, 255, 0.95)"
            />
          </NavLink>
        </div>

        {/* Navigation Links */}
        <nav className="sirnik-nav-list" style={{ gap: '0.4rem' }}>
          {navItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '0.72rem 1rem',
                  borderRadius: '2px',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.22)' : 'transparent'}`,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className={({ isActive: active }) => (active ? 'active' : '')}
              >
                <span
                  style={{
                    fontSize: '0.96rem',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom: Identity & Sign Out (Anchored at Bottom) ── */}
      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--line)',
          paddingTop: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Live Clock */}
        <div className="font-mono text-muted" style={{ fontSize: '0.62rem', letterSpacing: '0.04em', textAlign: 'center' }}>
          UTC {time}
        </div>

        {/* User Identity Card */}
        {user && (
          <div
            style={{
              padding: '0.7rem 0.85rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.015)',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              {firstName}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: '0.56rem',
                padding: '0.12rem 0.4rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.03)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {primaryRole}
            </span>
          </div>
        )}

        {/* Sign Out */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            fontSize: '0.72rem',
            padding: '0.5rem 0.85rem',
            color: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '2px',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
            e.target.style.color = '#ffffff';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.02)';
            e.target.style.color = 'rgba(255, 255, 255, 0.7)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          SIGN OUT
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
