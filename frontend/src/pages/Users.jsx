import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import { useRoles } from '../hooks/useRoles';

const Users = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const containerRef = useRef(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: allRoles } = useRoles();

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search, isActive: isActiveFilter }],
    queryFn: async () => {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (isActiveFilter !== '') params.is_active = isActiveFilter;

      const { data } = await api.get('/users', { params });
      return { users: data.data, meta: data.meta };
    },
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
  }, [data]);

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
      setActionSuccess('Identity deactivated');
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
      setActionSuccess('Role removed');
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

  return (
    <div className="sirnik-page" ref={containerRef}>
      {actionSuccess && <div className="sirnik-toast">{actionSuccess}</div>}
      {actionError && <div className="sirnik-toast" style={{ background: '#ef4444', color: '#fff' }}>{actionError}</div>}

      <div className="sirnik-page-header sirnik-anim">
        <span className="sirnik-page-number">02 · PROVISIONING DIRECTORY</span>
        <h1 className="sirnik-page-title">
          Directory<br />Identities.
        </h1>
        <p className="mt-md" style={{ maxWidth: '460px' }}>
          Manage user accounts, RBAC memberships, and account lifecycle activation states.
        </p>
      </div>

      {/* Filter controls */}
      <div className="flex gap-lg items-center mb-2xl sirnik-anim" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1.5rem' }}>
        <input
          type="text"
          className="sirnik-input"
          style={{ maxWidth: '320px', padding: '0.5rem 0' }}
          placeholder="SEARCH IDENTITY..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="sirnik-input"
          style={{ width: '180px', padding: '0.5rem 0', background: 'transparent' }}
          value={isActiveFilter}
          onChange={(e) => { setIsActiveFilter(e.target.value); setPage(1); }}
        >
          <option value="" style={{ background: '#000' }}>ALL STATUSES</option>
          <option value="true" style={{ background: '#000' }}>ACTIVE ONLY</option>
          <option value="false" style={{ background: '#000' }}>INACTIVE ONLY</option>
        </select>
      </div>

      {/* Borderless Sirnik Table */}
      <div className="sirnik-anim">
        <table className="sirnik-table">
          <thead>
            <tr>
              <th>USER IDENTITY</th>
              <th>ROLES</th>
              <th>STATUS</th>
              <th>MFA</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-muted py-4 font-mono">LOADING IDENTITIES...</td>
              </tr>
            ) : data?.users && data.users.length > 0 ? (
              data.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div>
                      <div className="font-bold text-white">
                        {u.first_name || u.last_name
                          ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                          : 'UNNAMED'}
                      </div>
                      <div className="font-mono text-xs text-muted">{u.email}</div>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                      {u.roles && u.roles.length > 0 ? (
                        u.roles.map((r, idx) => (
                          <span key={idx} className="sirnik-tag">
                            {r.name}
                            {hasPermission('role:update') && (
                              <button
                                type="button"
                                onClick={() => removeRoleMutation.mutate({ userId: u.id, roleId: r.id })}
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '6px' }}
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
                  <td>
                    <span className={`sirnik-tag ${u.is_active ? 'sirnik-tag-success' : 'sirnik-tag-danger'}`}>
                      {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-muted">
                      {u.mfa_enabled ? 'TOTP ENABLED' : 'DISABLED'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex justify-end gap-md">
                      {hasPermission('role:update') && (
                        <button onClick={() => openRoleModal(u)} className="sirnik-btn" style={{ padding: 0 }}>
                          <span>+ ROLE</span>
                        </button>
                      )}
                      {hasPermission('user:update') && (
                        <button onClick={() => openEditModal(u)} className="sirnik-btn" style={{ padding: 0 }}>
                          <span>EDIT</span>
                        </button>
                      )}
                      {hasPermission('user:delete') && u.is_active && (
                        <button
                          onClick={() => { if (confirm(`Deactivate ${u.email}?`)) deactivateUserMutation.mutate(u.id); }}
                          className="sirnik-btn text-danger"
                          style={{ padding: 0 }}
                        >
                          <span>DEACTIVATE</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-muted py-4 font-mono">NO IDENTITIES MATCHED</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.meta && (
          <div className="flex justify-between items-center mt-2xl pt-md" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="sirnik-meta">SHOWING {data.users?.length || 0} OF {data.meta.total} IDENTITIES</span>
            <div className="flex gap-md items-center">
              <button
                className="sirnik-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span>← PREV</span>
              </button>
              <span className="font-mono text-xs text-muted">PAGE {data.meta.page} OF {data.meta.totalPages || 1}</span>
              <button
                className="sirnik-btn"
                disabled={page >= (data.meta.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                <span>NEXT →</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-xs">EDIT IDENTITY</h3>
            <p className="font-mono text-xs text-muted mb-xl">{selectedUser?.email}</p>

            <form onSubmit={(e) => { e.preventDefault(); updateUserMutation.mutate({ id: selectedUser.id, updateData: { first_name: editFirstName, last_name: editLastName, is_active: editIsActive } }); }}>
              <div className="sirnik-input-group">
                <label className="sirnik-label">FIRST NAME</label>
                <input type="text" className="sirnik-input" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="sirnik-input-group">
                <label className="sirnik-label">LAST NAME</label>
                <input type="text" className="sirnik-input" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>

              <div className="modal-actions mt-xl">
                <button type="button" className="sirnik-btn" onClick={() => setIsEditModalOpen(false)}><span>CANCEL</span></button>
                <button type="submit" className="sirnik-btn-solid">SAVE CHANGES</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {isRoleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRoleModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-xs">ASSIGN RBAC ROLE</h3>
            <p className="font-mono text-xs text-muted mb-xl">{selectedUser?.email}</p>

            <form onSubmit={(e) => { e.preventDefault(); if (selectedRoleToAssign) assignRoleMutation.mutate({ userId: selectedUser.id, roleId: selectedRoleToAssign }); }}>
              <div className="sirnik-input-group">
                <label className="sirnik-label">SELECT ROLE</label>
                <select className="sirnik-input" style={{ background: '#000' }} value={selectedRoleToAssign} onChange={(e) => setSelectedRoleToAssign(e.target.value)} required>
                  <option value="">-- CHOOSE ROLE --</option>
                  {allRoles?.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions mt-xl">
                <button type="button" className="sirnik-btn" onClick={() => setIsRoleModalOpen(false)}><span>CANCEL</span></button>
                <button type="submit" className="sirnik-btn-solid" disabled={!selectedRoleToAssign}>ASSIGN ROLE</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
