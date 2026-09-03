import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import { useRoles, usePermissions } from '../hooks/useRoles';

// Clean Domain Mapping for all database permissions
const PERMISSION_METADATA = {
  'user:read': { domain: 'DIRECTORY IDENTITIES', desc: 'Inspect directory identities, profile attributes and session records' },
  'user:create': { domain: 'DIRECTORY IDENTITIES', desc: 'Provision and onboard new user accounts into the identity directory' },
  'user:update': { domain: 'DIRECTORY IDENTITIES', desc: 'Modify profile attributes and assign/revoke RBAC role memberships' },
  'user:delete': { domain: 'DIRECTORY IDENTITIES', desc: 'Deactivate user lifecycle and terminate active refresh token families' },

  'role:read': { domain: 'ACCESS CONTROL & RBAC', desc: 'Query role inheritance definitions, privilege scopes and capability policies' },
  'role:create': { domain: 'ACCESS CONTROL & RBAC', desc: 'Define and provision custom role policies within the authorization matrix' },
  'role:update': { domain: 'ACCESS CONTROL & RBAC', desc: 'Grant or revoke granular capability entitlements from existing roles' },
  'role:delete': { domain: 'ACCESS CONTROL & RBAC', desc: 'Deprovision and destroy custom RBAC role definitions' },

  'audit:read': { domain: 'AUDIT TRAIL & INTEGRITY', desc: 'Inspect chronological system event logs, actor telemetry and timestamps' },
  'audit:verify': { domain: 'AUDIT TRAIL & INTEGRITY', desc: 'Execute cryptographic SHA-256 Merkle hash chain integrity validation' },

  'mfa:manage': { domain: 'SECURITY & SESSIONS', desc: 'Enroll, reset, and enforce TOTP multi-factor authentication policies' },
};

const Roles = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const containerRef = useRef(null);

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: allPermissions, isLoading: permsLoading } = usePermissions();

  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const { data: selectedRole } = useQuery({
    queryKey: ['role-detail', selectedRoleId],
    queryFn: async () => {
      const { data } = await api.get(`/roles/${selectedRoleId}`);
      return data.data.role;
    },
    enabled: !!selectedRoleId,
  });

  const createRoleMutation = useMutation({
    mutationFn: async ({ name, description }) => {
      const { data } = await api.post('/roles', { name, description });
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setActionSuccess('Role provisioned successfully');
      if (res.data?.role?.id) setSelectedRoleId(res.data.role.id);
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId(null);
      setDeleteRoleTarget(null);
      setActionSuccess('Role deprovisioned successfully');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
    },
  });

  const assignPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }) => {
      await api.post(`/roles/${roleId}/permissions`, { permission_ids: permissionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-detail', selectedRoleId] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setActionSuccess('Permission entitlement granted');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const removePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }) => {
      await api.delete(`/roles/${roleId}/permissions`, { data: { permission_ids: permissionIds } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-detail', selectedRoleId] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setActionSuccess('Permission entitlement revoked');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
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
  }, [roles]);

  const assignedPermIds = useMemo(() => {
    return selectedRole?.permissions?.map((p) => p.id) || [];
  }, [selectedRole]);

  const handleTogglePermission = (permId, isCurrentlyAssigned) => {
    if (!hasPermission('role:update')) return;
    if (isCurrentlyAssigned) {
      removePermissionsMutation.mutate({ roleId: selectedRoleId, permissionIds: [permId] });
    } else {
      assignPermissionsMutation.mutate({ roleId: selectedRoleId, permissionIds: [permId] });
    }
  };

  // Group permissions cleanly by domain
  const groupedPermissions = useMemo(() => {
    if (!allPermissions) return {};
    const groups = {
      'DIRECTORY IDENTITIES': [],
      'ACCESS CONTROL & RBAC': [],
      'AUDIT TRAIL & INTEGRITY': [],
      'SECURITY & SESSIONS': [],
    };

    allPermissions.forEach((perm) => {
      const meta = PERMISSION_METADATA[perm.name] || {
        domain: (perm.resource === 'user'
          ? 'DIRECTORY IDENTITIES'
          : perm.resource === 'role'
            ? 'ACCESS CONTROL & RBAC'
            : perm.resource === 'audit'
              ? 'AUDIT TRAIL & INTEGRITY'
              : 'SECURITY & SESSIONS'),
        desc: `${perm.action} entitlement on ${perm.resource}`,
      };

      if (!groups[meta.domain]) groups[meta.domain] = [];
      groups[meta.domain].push({ ...perm, desc: meta.desc });
    });

    return groups;
  }, [allPermissions]);

  const isSuperAdminRole = selectedRole?.name === 'super_admin';
  const totalRolesCount = roles?.length || 0;
  const totalPermsCount = allPermissions?.length || 0;

  return (
    <div className="sirnik-page sirnik-grid-bg" ref={containerRef}>
      {actionSuccess && <div className="sirnik-toast">{actionSuccess}</div>}
      {actionError && <div className="sirnik-toast" style={{ background: '#ef4444', color: '#fff' }}>{actionError}</div>}

      {/* ── Page Header & Telemetry Status ── */}
      <div className="sirnik-page-header sirnik-anim" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number">AUTHORIZATION MATRIX</span>
            <h1 className="sirnik-page-title">
              Role Governance
            </h1>
            <p className="mt-md" style={{ maxWidth: '480px' }}>
              Define RBAC system roles, inspect entitlement scopes, and toggle granular capability grants in real time.
            </p>
          </div>

          {/* Right Side: Telemetry Box & Create Role Button */}
          <div className="flex flex-col items-end gap-md">
            <div
              className="sirnik-meta"
              style={{
                border: '1px solid var(--line-strong)',
                background: '#080808',
                backdropFilter: 'blur(12px)',
                padding: '0.85rem 1.4rem',
                borderRadius: '2px',
                minWidth: '220px',
              }}
            >
              <div style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                GOVERNANCE TELEMETRY
              </div>
              <div className="font-mono text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>DEFINED ROLES:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{totalRolesCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>SYSTEM ROOT:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>1 IMMUTABLE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>TOTAL CAPABILITIES:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{totalPermsCount}</span>
                </div>
              </div>
            </div>

            {hasPermission('role:create') && (
              <button
                onClick={() => setIsCreateRoleModalOpen(true)}
                className="sirnik-action-box-btn"
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                + CREATE ROLE
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tier 1: Horizontal Defined Roles Selector Grid ── */}
      <div className="sirnik-anim mb-2xl">
        <div className="flex justify-between items-center mb-md" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.6rem' }}>
          <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
            DEFINED RBAC ROLES MATRIX
          </span>
          <span className="font-mono text-xs text-muted">[{roles?.length || 0} ACTIVE ROLES]</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(roles?.length || 3, 3)}, 1fr)`,
            gap: '1.25rem',
          }}
        >
          {rolesLoading ? (
            <div className="text-muted font-mono py-4 text-xs">LOADING ROLE DEFINITIONS...</div>
          ) : (
            roles?.map((r) => {
              const isSelected = r.id === selectedRoleId;
              const isSuper = r.name === 'super_admin';

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  style={{
                    padding: '1.25rem 1.4rem',
                    border: `1px solid ${isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.08)'}`,
                    background: isSelected ? '#0e0e0e' : '#080808',
                    backdropFilter: 'blur(12px)',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    borderRadius: '2px',
                  }}
                  className="hover-card-lift"
                >
                  <div className="flex justify-between items-start mb-xs">
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        letterSpacing: '-0.01em',
                        color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                      }}
                    >
                      {r.name}
                    </span>
                    <span
                      className="sirnik-tag"
                      style={{
                        fontSize: '0.58rem',
                        borderColor: isSuper ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        color: isSuper ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                        background: isSuper ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                      }}
                    >
                      {isSuper ? 'SYSTEM ROOT' : 'CUSTOM ROLE'}
                    </span>
                  </div>

                  <p style={{ margin: '0.35rem 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, minHeight: '2.8em' }}>
                    {r.description || 'Custom capability grouping matrix.'}
                  </p>

                  <div className="flex justify-between items-center pt-xs">
                    <span className="font-mono text-xs" style={{ color: isSelected ? '#ffffff' : 'var(--text-muted)', fontSize: '0.68rem' }}>
                      {isSelected ? '● ACTIVE MATRIX' : 'CLICK TO INSPECT'}
                    </span>

                    {!isSuper && isSelected && hasPermission('role:delete') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteRoleTarget(r);
                        }}
                        className="sirnik-action-box-btn"
                        style={{
                          fontSize: '0.62rem',
                          padding: '0.25rem 0.55rem',
                          color: 'var(--danger)',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Tier 2: Full-Width Granular Entitlement Matrix ── */}
      <div
        className="sirnik-anim"
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          padding: '2rem 2.4rem',
          borderRadius: '2px',
          width: '100%',
        }}
      >
        {/* Active Role Header */}
        <div className="flex justify-between items-center mb-xl flex-wrap gap-md" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1.25rem' }}>
          <div>
            <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem' }}>
              GRANULAR ENTITLEMENT GRANTS
            </span>
            <h3 style={{ margin: '0.25rem 0 0', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              {selectedRole ? selectedRole.name.toUpperCase() : 'SELECT A ROLE'}
            </h3>
          </div>

          <div>
            {isSuperAdminRole ? (
              <span
                className="sirnik-tag"
                style={{
                  fontSize: '0.68rem',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '0.35rem 0.75rem',
                }}
              >
                ROOT IMMUTABLE · FULL PRIVILEGES
              </span>
            ) : (
              <span className="font-mono text-xs text-muted" style={{ fontSize: '0.78rem' }}>
                <strong style={{ color: '#ffffff' }}>{assignedPermIds.length}</strong> OF {totalPermsCount} CAPABILITIES GRANTED
              </span>
            )}
          </div>
        </div>

        {/* Grouped Permission Scopes in Full-Width Grid */}
        {permsLoading ? (
          <div className="text-muted font-mono text-xs py-8 text-center">LOADING CAPABILITY MATRIX...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {Object.entries(groupedPermissions).map(([domain, perms]) => {
              if (perms.length === 0) return null;
              return (
                <div key={domain}>
                  {/* Domain Category Label */}
                  <div
                    className="font-mono text-xs mb-md"
                    style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingBottom: '0.45rem',
                    }}
                  >
                    {domain} <span style={{ opacity: 0.5 }}>({perms.length} POLICIES)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                    {perms.map((perm) => {
                      const isAssigned = isSuperAdminRole || assignedPermIds.includes(perm.id);

                      return (
                        <div
                          key={perm.id}
                          style={{
                            padding: '1rem 1.25rem',
                            background: isAssigned ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                            border: `1px solid ${isAssigned ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div className="flex items-center gap-xs" style={{ flexWrap: 'wrap' }}>
                              <span className="font-mono text-xs font-bold" style={{ color: '#ffffff', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                                {perm.name}
                              </span>
                              <span className="font-mono text-muted" style={{ fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
                                ({perm.resource} · {perm.action})
                              </span>
                            </div>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                              {perm.desc}
                            </p>
                          </div>

                          {/* Interactive Toggle Pill */}
                          <div style={{ flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSuperAdminRole) handleTogglePermission(perm.id, isAssigned);
                              }}
                              disabled={isSuperAdminRole || !hasPermission('role:update')}
                              className="sirnik-action-box-btn"
                              style={{
                                fontSize: '0.62rem',
                                padding: '0.28rem 0.65rem',
                                borderColor: isAssigned ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                                color: isAssigned ? '#000000' : 'rgba(255, 255, 255, 0.4)',
                                background: isAssigned ? '#ffffff' : 'transparent',
                                fontWeight: isAssigned ? 700 : 500,
                                cursor: isSuperAdminRole ? 'not-allowed' : 'pointer',
                                opacity: isSuperAdminRole ? 0.7 : 1,
                              }}
                              title={isSuperAdminRole ? 'Super Admin permissions are permanently granted' : isAssigned ? 'Click to revoke' : 'Click to grant'}
                            >
                              {isSuperAdminRole ? 'LOCKED' : isAssigned ? 'GRANTED' : 'DENIED'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Role Modal ── */}
      {isCreateRoleModalOpen && (
        <div
          className="modal-overlay"
          style={{ backdropFilter: 'blur(24px)', background: 'rgba(0, 0, 0, 0.88)', zIndex: 1000 }}
          onClick={() => setIsCreateRoleModalOpen(false)}
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
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>[PROVISIONING]</span>
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Provision New Role
            </h3>
            <p className="font-mono text-xs text-muted mb-lg" style={{ lineHeight: 1.5 }}>
              Define a new RBAC role definition to group granular capability entitlements.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newRoleName) {
                  createRoleMutation.mutate({
                    name: newRoleName,
                    description: newRoleDesc,
                  });
                }
              }}
            >
              <div className="sirnik-input-group mb-md">
                <label className="sirnik-label" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
                  ROLE IDENTIFIER (SNAKE_CASE)
                </label>
                <input
                  type="text"
                  className="sirnik-input"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--line-strong)',
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: '0.82rem',
                  }}
                  placeholder="role_name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  required
                  autoFocus
                />
              </div>

              <div className="sirnik-input-group mb-lg">
                <label className="sirnik-label" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
                  ROLE DESCRIPTION / SCOPE
                </label>
                <input
                  type="text"
                  className="sirnik-input"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--line-strong)',
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: '0.82rem',
                  }}
                  placeholder="Role description and scope"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions mt-xl flex justify-end gap-md">
                <button
                  type="button"
                  className="sirnik-action-box-btn"
                  onClick={() => setIsCreateRoleModalOpen(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="sirnik-action-box-btn"
                  style={{
                    color: '#ffffff',
                    borderColor: newRoleName ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    background: newRoleName ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    fontWeight: 700,
                  }}
                  disabled={!newRoleName || createRoleMutation.isPending}
                >
                  {createRoleMutation.isPending ? 'PROVISIONING...' : 'CREATE ROLE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Role Modal ── */}
      {deleteRoleTarget && (
        <div
          className="modal-overlay"
          style={{ backdropFilter: 'blur(24px)', background: 'rgba(0, 0, 0, 0.88)', zIndex: 1000 }}
          onClick={() => setDeleteRoleTarget(null)}
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
                ACCESS CONTROL GOVERNANCE
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>[DELETION]</span>
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Deprovision RBAC Role
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
                <span style={{ color: 'var(--text-muted)' }}>TARGET ROLE:</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>[{deleteRoleTarget.name?.toUpperCase()}]</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>DESCRIPTION:</span>
                <span style={{ color: '#ffffff', fontWeight: 500 }}>{deleteRoleTarget.description || 'Custom role'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>SECURITY IMPACT:</span>
                <span style={{ color: 'var(--danger)' }}>PERMANENT POLICY REMOVAL</span>
              </div>
            </div>

            <p className="text-xs text-muted font-mono mb-xl" style={{ margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              This action will permanently delete the role definition and unassign it from all active users.
            </p>

            <div className="modal-actions flex justify-end gap-md">
              <button
                type="button"
                className="sirnik-action-box-btn"
                onClick={() => setDeleteRoleTarget(null)}
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
                disabled={deleteRoleMutation.isPending}
                onClick={() => {
                  deleteRoleMutation.mutate(deleteRoleTarget.id);
                }}
              >
                {deleteRoleMutation.isPending ? 'DELETING...' : 'CONFIRM DELETION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
