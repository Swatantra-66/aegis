import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import { useRoles } from '../hooks/useRoles';

// Clean SVG UserCog Icon for Admins
const UserCogIcon = ({ size = 13, color = '#ffffff' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.35rem', flexShrink: 0 }}
  >
    <circle cx="9" cy="7" r="4" />
    <path d="M10 15H6a4 4 0 0 0-4 4v2" />
    <circle cx="19" cy="11" r="2" />
    <path d="M19 8v1" />
    <path d="M19 13v1" />
    <path d="m21.6 9.5-.87.5" />
    <path d="m17.27 12-.87.5" />
    <path d="m21.6 12.5-.87-.5" />
    <path d="m17.27 10-.87-.5" />
  </svg>
);

const Users = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const containerRef = useRef(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const [isMfaFilter, setIsMfaFilter] = useState('');
  const [isMfaDropdownOpen, setIsMfaDropdownOpen] = useState(false);
  const mfaDropdownRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null); // { user, role }
  const [deactivateTarget, setDeactivateTarget] = useState(null); // user object
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (mfaDropdownRef.current && !mfaDropdownRef.current.contains(event.target)) {
        setIsMfaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: allRoles } = useRoles();

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search, isActive: isActiveFilter, mfaEnabled: isMfaFilter }],
    queryFn: async () => {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (isActiveFilter !== '') params.is_active = isActiveFilter;
      if (isMfaFilter !== '') params.mfa_enabled = isMfaFilter;

      const { data } = await api.get('/users', { params });
      return { users: data.data || [], meta: data.meta || {} };
    },
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.sirnik-anim', {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.05,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updateData }) => {
      const { data } = await api.patch(`/users/${id}`, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      setActionSuccess('Identity updated successfully');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setActionSuccess('Identity deactivated successfully');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }) => {
      await api.post(`/roles/users/${userId}/roles`, { role_id: roleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsRoleModalOpen(false);
      setActionSuccess('Role assigned successfully');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }) => {
      await api.delete(`/roles/users/${userId}/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setActionSuccess('Role removed successfully');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
    },
  });

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFirstName(user.first_name || '');
    setEditLastName(user.last_name || '');
    setEditIsActive(user.is_active);
    setActionError('');
    setIsEditModalOpen(true);
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRoleToAssign('');
    setActionError('');
    setIsRoleModalOpen(true);
  };

  // Telemetry metrics
  const totalUsers = data?.meta?.total || (data?.users?.length ?? 0);
  const activeCount = data?.users?.filter((u) => u.is_active).length ?? 0;
  const mfaCount = data?.users?.filter((u) => u.mfa_enabled).length ?? 0;

  return (
    <div className="sirnik-page sirnik-grid-bg" ref={containerRef}>
      {actionSuccess && <div className="sirnik-toast">{actionSuccess}</div>}
      {actionError && <div className="sirnik-toast" style={{ background: '#ef4444', color: '#fff' }}>{actionError}</div>}

      <div className="sirnik-page-header sirnik-anim" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number">PROVISIONING DIRECTORY</span>
            <h1 className="sirnik-page-title">
              Directory Identities
            </h1>
            <p className="mt-md" style={{ maxWidth: '480px' }}>
              Manage user accounts, granular RBAC memberships, and account lifecycle activation states.
            </p>
          </div>

          {/* Directory Telemetry Summary Block */}
          <div
            className="sirnik-meta"
            style={{
              border: '1px solid var(--line-strong)',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(12px)',
              padding: '0.85rem 1.4rem',
              borderRadius: '2px',
              minWidth: '220px',
            }}
          >
            <div style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              PROVISIONING STATUS
            </div>
            <div className="font-mono text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>TOTAL RECORDS:</span>
                <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{totalUsers}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>ACTIVE:</span>
                <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{activeCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>MFA ENABLED:</span>
                <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{mfaCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div
        className="flex gap-md items-center mb-xl sirnik-anim flex-wrap"
        style={{ position: 'relative', zIndex: 100 }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '380px' }}>
          <input
            type="text"
            className="sirnik-input"
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              border: '1px solid var(--line-strong)',
              background: 'rgba(255, 255, 255, 0.02)',
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
            }}
            placeholder="SEARCH IDENTITY (NAME, EMAIL)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Bespoke Dark Status Filter Dropdown */}
        <div style={{ position: 'relative', minWidth: '170px' }} ref={statusDropdownRef}>
          <div
            onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              border: `1px solid ${isStatusDropdownOpen ? '#ffffff' : 'var(--line-strong)'}`,
              backgroundColor: '#0c0c0c',
              background: '#0c0c0c',
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none',
              transition: 'border-color 0.2s',
            }}
          >
            <span className="font-mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isActiveFilter === 'true' ? 'ACTIVE ONLY' : isActiveFilter === 'false' ? 'INACTIVE ONLY' : 'ALL STATUSES'}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                marginLeft: '0.5rem',
                opacity: 0.6,
                flexShrink: 0,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isStatusDropdownOpen && (
            <div
              className="sirnik-custom-dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#0c0c0c',
                background: '#0c0c0c',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 24px 48px #000000, 0 0 0 1px rgba(255, 255, 255, 0.1)',
                zIndex: 9999,
                borderRadius: '2px',
              }}
            >
              {[
                { value: '', label: 'ALL STATUSES' },
                { value: 'true', label: 'ACTIVE ONLY' },
                { value: 'false', label: 'INACTIVE ONLY' },
              ].map((opt) => {
                const isSelected = isActiveFilter === opt.value;
                return (
                  <div
                    key={opt.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsActiveFilter(opt.value);
                      setPage(1);
                      setIsStatusDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.65rem 1rem',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : '#0c0c0c',
                      background: isSelected ? 'rgba(255, 255, 255, 0.08)' : '#0c0c0c',
                      fontWeight: isSelected ? 700 : 400,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#0c0c0c';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      }
                    }}
                  >
                    <span>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bespoke Dark MFA Security Filter Dropdown */}
        <div style={{ position: 'relative', minWidth: '170px' }} ref={mfaDropdownRef}>
          <div
            onClick={() => setIsMfaDropdownOpen((prev) => !prev)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              border: `1px solid ${isMfaDropdownOpen ? '#ffffff' : 'var(--line-strong)'}`,
              backgroundColor: '#0c0c0c',
              background: '#0c0c0c',
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none',
              transition: 'border-color 0.2s',
            }}
          >
            <span className="font-mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isMfaFilter === 'true' ? 'MFA ENABLED' : isMfaFilter === 'false' ? 'MFA DISABLED' : 'ALL MFA STATES'}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isMfaDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                marginLeft: '0.5rem',
                opacity: 0.6,
                flexShrink: 0,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isMfaDropdownOpen && (
            <div
              className="sirnik-custom-dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#0c0c0c',
                background: '#0c0c0c',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 24px 48px #000000, 0 0 0 1px rgba(255, 255, 255, 0.1)',
                zIndex: 9999,
                borderRadius: '2px',
              }}
            >
              {[
                { value: '', label: 'ALL MFA STATES' },
                { value: 'true', label: 'MFA ENABLED' },
                { value: 'false', label: 'MFA DISABLED' },
              ].map((opt) => {
                const isSelected = isMfaFilter === opt.value;
                return (
                  <div
                    key={opt.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsMfaFilter(opt.value);
                      setPage(1);
                      setIsMfaDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.65rem 1rem',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : '#0c0c0c',
                      background: isSelected ? 'rgba(255, 255, 255, 0.08)' : '#0c0c0c',
                      fontWeight: isSelected ? 700 : 400,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#0c0c0c';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      }
                    }}
                  >
                    <span>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Identities Data Table ── */}
      <div className="sirnik-anim">
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="sirnik-table" style={{ width: '100%', minWidth: '980px', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '28%', padding: '0.85rem 0.6rem' }}>USER IDENTITY</th>
                <th style={{ width: '22%', padding: '0.85rem 0.6rem' }}>ASSIGNED ROLES</th>
                <th style={{ width: '12%', padding: '0.85rem 0.6rem' }}>STATUS</th>
                <th style={{ width: '14%', padding: '0.85rem 0.6rem' }}>MFA SECURITY</th>
                <th style={{ width: '24%', padding: '0.85rem 0.6rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-muted py-4 font-mono text-center">
                    LOADING IDENTITIES TELEMETRY...
                  </td>
                </tr>
              ) : data?.users && data.users.length > 0 ? (
                data.users.map((u) => {
                  const roleNames = Array.isArray(u.roles)
                    ? u.roles.map((r) => (typeof r === 'string' ? r.toLowerCase() : (r?.name || '').toLowerCase()))
                    : [];
                  const isSuperAdmin = roleNames.some((r) => r.includes('super_admin') || r.includes('superadmin'));
                  const isAdmin = !isSuperAdmin && roleNames.some((r) => r.includes('admin'));

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      {/* Identity: Name, Email & Vector Cog */}
                      <td style={{ padding: '1.1rem 0.6rem', whiteSpace: 'nowrap' }}>
                        <div>
                          <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
                            {u.first_name || u.last_name
                              ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                              : 'UNNAMED IDENTITY'}
                          </div>
                          <div
                            className="font-mono text-xs"
                            style={{
                              color: 'var(--text-muted)',
                              marginTop: '0.2rem',
                              display: 'flex',
                              alignItems: 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={`ID: ${u.id}`}
                          >
                            {(isSuperAdmin || isAdmin) && (
                              <span title={isSuperAdmin ? 'Super Administrator' : 'Administrator'}>
                                <UserCogIcon size={13} color="#ffffff" />
                              </span>
                            )}
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* RBAC Roles */}
                      <td style={{ padding: '1.1rem 0.6rem' }}>
                        <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                          {u.roles && u.roles.length > 0 ? (
                            u.roles.map((r, idx) => (
                              <span
                                key={idx}
                                className="sirnik-tag"
                                style={{
                                  fontSize: '0.65rem',
                                  borderColor: 'rgba(255, 255, 255, 0.15)',
                                  color: '#ffffff',
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                {typeof r === 'string' ? r : r.name}
                                {hasPermission('role:update') && (
                                  <button
                                    type="button"
                                    onClick={() => setRevokeTarget({ user: u, role: r })}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      marginLeft: '6px',
                                      padding: 0,
                                      lineHeight: 1,
                                      fontSize: '0.75rem',
                                    }}
                                    title="Revoke Role"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted font-mono">NO ROLES</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1.1rem 0.6rem', whiteSpace: 'nowrap' }}>
                        <span
                          className="sirnik-tag"
                          style={{
                            fontSize: '0.62rem',
                            letterSpacing: '0.06em',
                            borderColor: u.is_active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(239, 68, 68, 0.3)',
                            color: u.is_active ? '#ffffff' : 'var(--danger)',
                            background: 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>

                      {/* MFA State */}
                      <td style={{ padding: '1.1rem 0.6rem', whiteSpace: 'nowrap' }}>
                        <span
                          className="font-mono text-xs"
                          style={{ color: u.mfa_enabled ? '#ffffff' : 'var(--text-muted)', fontSize: '0.75rem' }}
                        >
                          {u.mfa_enabled ? '[MFA ENABLED]' : 'DISABLED'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1.1rem 0.6rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="flex justify-end gap-xs" style={{ whiteSpace: 'nowrap' }}>
                          {hasPermission('role:update') && (
                            <button
                              onClick={() => openRoleModal(u)}
                              className="sirnik-action-box-btn"
                              style={{ fontSize: '0.68rem', padding: '0.35rem 0.65rem' }}
                            >
                              + ROLE
                            </button>
                          )}
                          {hasPermission('user:update') && (
                            <button
                              onClick={() => openEditModal(u)}
                              className="sirnik-action-box-btn"
                              style={{ fontSize: '0.68rem', padding: '0.35rem 0.65rem' }}
                            >
                              EDIT
                            </button>
                          )}
                          {hasPermission('user:delete') && u.is_active && (
                            <button
                              onClick={() => setDeactivateTarget(u)}
                              className="sirnik-action-box-btn"
                              style={{ fontSize: '0.68rem', padding: '0.35rem 0.65rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                            >
                              DEACTIVATE
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-muted py-4 font-mono text-center">
                    Zero identities matched the specified query criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {data?.meta && (
          <div className="flex justify-between items-center mt-2xl pt-md flex-wrap gap-md" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="sirnik-meta font-mono text-xs">
              SHOWING {data.users?.length || 0} OF {data.meta.total || totalUsers} IDENTITIES
            </span>
            <div className="flex gap-md items-center font-mono">
              <button
                className="sirnik-action-box-btn"
                style={{ fontSize: '0.72rem', padding: '0.4rem 0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                PREV
              </button>
              <span className="text-xs text-muted">
                PAGE {data.meta.page || page} OF {data.meta.totalPages || 1}
              </span>
              <button
                className="sirnik-action-box-btn"
                style={{ fontSize: '0.72rem', padding: '0.4rem 0.8rem' }}
                disabled={page >= (data.meta.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                NEXT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Identity Modal ── */}
      {isEditModalOpen && (
        <div
          className="modal-overlay"
          style={{ backdropFilter: 'blur(20px)', background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="modal"
            style={{
              background: '#090909',
              border: '1px solid var(--line-strong)',
              borderRadius: '2px',
              padding: '2rem',
              maxWidth: '460px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sirnik-page-number" style={{ fontSize: '0.68rem' }}>IDENTITY PROVISIONING</span>
            <h3 style={{ margin: '0.25rem 0', fontWeight: 700 }}>EDIT IDENTITY</h3>
            <p className="font-mono text-xs text-muted mb-xl">{selectedUser?.email}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUserMutation.mutate({
                  id: selectedUser.id,
                  updateData: {
                    first_name: editFirstName,
                    last_name: editLastName,
                    is_active: editIsActive,
                  },
                });
              }}
            >
              <div className="sirnik-input-group mb-md">
                <label className="sirnik-label" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>FIRST NAME</label>
                <input
                  type="text"
                  className="sirnik-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--line-strong)', background: 'rgba(255,255,255,0.02)' }}
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </div>
              <div className="sirnik-input-group mb-lg">
                <label className="sirnik-label" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>LAST NAME</label>
                <input
                  type="text"
                  className="sirnik-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--line-strong)', background: 'rgba(255,255,255,0.02)' }}
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </div>

              <div className="modal-actions mt-xl flex justify-end gap-md">
                <button
                  type="button"
                  className="sirnik-action-box-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="sirnik-btn-solid"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Role Modal ── */}
      {isRoleModalOpen && (
        <div
          className="modal-overlay"
          style={{ backdropFilter: 'blur(24px)', background: 'rgba(0, 0, 0, 0.88)', zIndex: 1000 }}
          onClick={() => setIsRoleModalOpen(false)}
        >
          <div
            className="modal"
            style={{
              background: '#090909',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '2px',
              padding: '2.2rem 2.4rem',
              maxWidth: '520px',
              width: '92%',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-md" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.12em' }}>
                ACCESS CONTROL MATRIX
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>[ASSIGNMENT]</span>
            </div>

            <h3 style={{ margin: '0 0 0.25rem', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Assign RBAC Role
            </h3>

            {/* Target Identity Box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line-strong)',
                padding: '0.75rem 1rem',
                margin: '1rem 0 1.25rem',
                borderRadius: '2px',
              }}
              className="font-mono text-xs"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>TARGET IDENTITY:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{selectedUser?.email}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedRoleToAssign) {
                  assignRoleMutation.mutate({
                    userId: selectedUser.id,
                    roleId: selectedRoleToAssign,
                  });
                }
              }}
            >
              <label className="sirnik-label" style={{ fontSize: '0.68rem', letterSpacing: '0.08em', marginBottom: '0.6rem', display: 'block' }}>
                SELECT ROLE DEFINITION
              </label>

              {/* Bespoke Interactive Role Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {allRoles?.map((r) => {
                  const isSelected = selectedRoleToAssign === r.id;
                  const roleNameLower = (r.name || '').toLowerCase();
                  const desc =
                    roleNameLower === 'super_admin'
                      ? 'Full root cryptographic governance & SDLC orchestration'
                      : roleNameLower === 'admin'
                        ? 'Directory provisioning, policy configuration & security audits'
                        : roleNameLower === 'user'
                          ? 'Standard consumer access & authenticated profile capabilities'
                          : 'Granular access policy group';

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRoleToAssign(r.id)}
                      style={{
                        padding: '0.85rem 1rem',
                        border: `1px solid ${isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.08)'}`,
                        background: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.015)',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                      className="hover-card-lift"
                    >
                      <div>
                        <div className="flex items-center gap-xs">
                          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                            {r.name?.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                          {desc}
                        </p>
                      </div>

                      <div className="font-mono text-xs" style={{ flexShrink: 0 }}>
                        <span
                          className="sirnik-tag"
                          style={{
                            fontSize: '0.6rem',
                            borderColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                            color: isSelected ? '#000000' : 'rgba(255, 255, 255, 0.7)',
                            background: isSelected ? '#ffffff' : 'transparent',
                            fontWeight: isSelected ? 700 : 500,
                          }}
                        >
                          {isSelected ? 'SELECTED' : 'SELECT'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="modal-actions flex justify-end gap-md">
                <button
                  type="button"
                  className="sirnik-action-box-btn"
                  onClick={() => setIsRoleModalOpen(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="sirnik-action-box-btn"
                  style={{
                    color: '#ffffff',
                    borderColor: selectedRoleToAssign ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    background: selectedRoleToAssign ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    fontWeight: 700,
                    opacity: selectedRoleToAssign ? 1 : 0.4,
                  }}
                  disabled={!selectedRoleToAssign || assignRoleMutation.isPending}
                >
                  {assignRoleMutation.isPending ? 'ASSIGNING...' : 'ASSIGN ROLE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Role Revocation Modal ── */}
      {revokeTarget && (
        <div
          className="modal-overlay"
          style={{ backdropFilter: 'blur(24px)', background: 'rgba(0, 0, 0, 0.88)', zIndex: 1000 }}
          onClick={() => setRevokeTarget(null)}
        >
          <div
            className="modal"
            style={{
              background: '#090909',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '2px',
              padding: '2.2rem 2.4rem',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-md" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.12em' }}>
                ACCESS CONTROL GOVERNANCE
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>[REVOCATION]</span>
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Revoke Assigned Role
            </h3>

            {/* Context Box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line-strong)',
                padding: '0.85rem 1rem',
                margin: '1.25rem 0',
                borderRadius: '2px',
              }}
              className="font-mono text-xs"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>TARGET IDENTITY:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{revokeTarget.user?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>REVOKING ROLE:</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>[{revokeTarget.role?.name?.toUpperCase()}]</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>POLICY IMPACT:</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>IMMEDIATE PRIVILEGE DROP</span>
              </div>
            </div>

            <p className="text-xs text-muted font-mono mb-xl" style={{ margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              This will remove the user's role inheritance and revoke matching permissions in the next access token cycle.
            </p>

            <div className="modal-actions flex justify-end gap-md">
              <button
                type="button"
                className="sirnik-action-box-btn"
                onClick={() => setRevokeTarget(null)}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="sirnik-action-box-btn"
                style={{
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  fontWeight: 700,
                }}
                disabled={removeRoleMutation.isPending}
                onClick={() => {
                  removeRoleMutation.mutate({
                    userId: revokeTarget.user.id,
                    roleId: revokeTarget.role.id,
                  });
                  setRevokeTarget(null);
                }}
              >
                {removeRoleMutation.isPending ? 'REVOKING...' : 'CONFIRM REVOCATION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Deactivate Identity Modal ── */}
      {deactivateTarget && (
        <div
          className="modal-overlay"
          style={{ backdropFilter: 'blur(24px)', background: 'rgba(0, 0, 0, 0.88)', zIndex: 1000 }}
          onClick={() => setDeactivateTarget(null)}
        >
          <div
            className="modal"
            style={{
              background: '#090909',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '2px',
              padding: '2.2rem 2.4rem',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-md" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.12em', color: 'var(--danger)' }}>
                IDENTITY LIFECYCLE GOVERNANCE
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>[DEACTIVATION]</span>
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Deactivate Identity
            </h3>

            {/* Context Box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line-strong)',
                padding: '0.85rem 1rem',
                margin: '1.25rem 0',
                borderRadius: '2px',
              }}
              className="font-mono text-xs"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>TARGET IDENTITY:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{deactivateTarget.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>ACCOUNT NAME:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>
                  {deactivateTarget.first_name || deactivateTarget.last_name
                    ? `${deactivateTarget.first_name || ''} ${deactivateTarget.last_name || ''}`.trim()
                    : 'UNNAMED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>SECURITY IMPACT:</span>
                <span style={{ color: 'var(--danger)' }}>IMMEDIATE SESSION TERMINATION</span>
              </div>
            </div>

            <p className="text-xs text-muted font-mono mb-xl" style={{ margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              This will mark the user account as INACTIVE and prevent all further logins or token refresh operations.
            </p>

            <div className="modal-actions flex justify-end gap-md">
              <button
                type="button"
                className="sirnik-action-box-btn"
                onClick={() => setDeactivateTarget(null)}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="sirnik-action-box-btn"
                style={{
                  color: 'var(--danger)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  fontWeight: 700,
                }}
                disabled={deactivateUserMutation.isPending}
                onClick={() => {
                  deactivateUserMutation.mutate(deactivateTarget.id);
                  setDeactivateTarget(null);
                }}
              >
                {deactivateUserMutation.isPending ? 'DEACTIVATING...' : 'CONFIRM DEACTIVATION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
