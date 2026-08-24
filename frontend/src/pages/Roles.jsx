import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import { useRoles, usePermissions } from '../hooks/useRoles';

const Roles = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const containerRef = useRef(null);

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: allPermissions } = usePermissions();

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
      setActionSuccess('Role created successfully');
      if (res.data?.role?.id) setSelectedRoleId(res.data.role.id);
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId(null);
      setActionSuccess('Role deleted');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const assignPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }) => {
      await api.post(`/roles/${roleId}/permissions`, { permission_ids: permissionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-detail', selectedRoleId] });
      setActionSuccess('Permission granted');
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
      setActionSuccess('Permission revoked');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.sirnik-anim', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power3.out',
        clearProps: 'all',
      });
    }, containerRef);

    return () => ctx.revert();
  }, [roles]);

  const assignedPermIds = selectedRole?.permissions?.map((p) => p.id) || [];

  const handleTogglePermission = (permId, isCurrentlyAssigned) => {
    if (!hasPermission('role:update')) return;
    if (isCurrentlyAssigned) {
      removePermissionsMutation.mutate({ roleId: selectedRoleId, permissionIds: [permId] });
    } else {
      assignPermissionsMutation.mutate({ roleId: selectedRoleId, permissionIds: [permId] });
    }
  };

  return (
    <div className="sirnik-page" ref={containerRef}>
      {actionSuccess && <div className="sirnik-toast">{actionSuccess}</div>}
      {actionError && <div className="sirnik-toast" style={{ background: '#ef4444', color: '#fff' }}>{actionError}</div>}

      <div className="sirnik-page-header sirnik-anim">
        <div className="flex justify-between items-end">
          <div>
            <span className="sirnik-page-number">03 · AUTHORIZATION MATRIX</span>
            <h1 className="sirnik-page-title">
              Role<br />Governance.
            </h1>
            <p className="mt-md" style={{ maxWidth: '460px' }}>
              Define RBAC system roles and toggle granular resource entitlement grants.
            </p>
          </div>
          {hasPermission('role:create') && (
            <button onClick={() => setIsCreateRoleModalOpen(true)} className="sirnik-btn-solid">
              + NEW ROLE
            </button>
          )}
        </div>
      </div>

      <div className="sirnik-grid-2 sirnik-anim">
        {/* Left Column: Roles */}
        <div>
          <span className="sirnik-meta block mb-lg">SYSTEM ROLES</span>
          <div className="flex flex-col">
            {rolesLoading ? (
              <div className="text-muted font-mono py-4">LOADING ROLES...</div>
            ) : roles?.map((r) => {
              const isSelected = r.id === selectedRoleId;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  style={{
                    padding: '1.25rem 0',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div className={`font-bold ${isSelected ? 'text-white' : 'text-muted'}`} style={{ fontSize: '1.1rem' }}>
                      {r.name}
                    </div>
                    <div className="text-xs text-muted font-mono">{r.description || 'No description'}</div>
                  </div>

                  {r.name === 'super_admin' ? (
                    <span className="sirnik-tag">SYSTEM</span>
                  ) : (
                    isSelected && hasPermission('role:delete') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm(`Delete role ${r.name}?`)) deleteRoleMutation.mutate(r.id); }}
                        className="sirnik-btn text-danger"
                        style={{ padding: 0 }}
                      >
                        <span>DELETE</span>
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permission Grants */}
        <div>
          <div className="flex justify-between items-center mb-lg">
            <span className="sirnik-meta">PERMISSIONS · {selectedRole?.name?.toUpperCase() || 'SELECT ROLE'}</span>
            {selectedRole?.name === 'super_admin' && (
              <span className="sirnik-tag sirnik-tag-success">FULL AUTHORIZATION</span>
            )}
          </div>

          <div className="flex flex-col">
            {allPermissions?.map((perm) => {
              const isAssigned = selectedRole?.name === 'super_admin' || assignedPermIds.includes(perm.id);
              const isSuperAdmin = selectedRole?.name === 'super_admin';

              return (
                <div
                  key={perm.id}
                  style={{
                    padding: '1rem 0',
                    borderBottom: '1px solid var(--line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div className="font-mono text-sm font-bold text-white">{perm.name}</div>
                    <div className="text-xs text-muted font-mono">
                      {perm.resource} · {perm.action}
                    </div>
                  </div>

                  <div
                    className={`toggle ${isAssigned ? 'active' : ''}`}
                    onClick={() => { if (!isSuperAdmin) handleTogglePermission(perm.id, isAssigned); }}
                    style={{ opacity: isSuperAdmin ? 0.4 : 1, cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {isCreateRoleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateRoleModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-xs">CREATE ROLE</h3>
            <p className="font-mono text-xs text-muted mb-xl">Define custom RBAC membership</p>

            <form onSubmit={(e) => { e.preventDefault(); createRoleMutation.mutate({ name: newRoleName, description: newRoleDesc }); }}>
              <div className="sirnik-input-group">
                <label className="sirnik-label">ROLE NAME</label>
                <input
                  type="text"
                  className="sirnik-input"
                  placeholder="role_identifier"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  required
                  autoFocus
                />
              </div>

              <div className="sirnik-input-group">
                <label className="sirnik-label">DESCRIPTION</label>
                <input
                  type="text"
                  className="sirnik-input"
                  placeholder="Purpose of this role..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions mt-xl">
                <button type="button" className="sirnik-btn" onClick={() => setIsCreateRoleModalOpen(false)}><span>CANCEL</span></button>
                <button type="submit" className="sirnik-btn-solid" disabled={!newRoleName}>CREATE ROLE</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
