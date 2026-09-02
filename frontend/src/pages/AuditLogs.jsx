import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import { AUDIT_ACTIONS, getActionBadgeType } from '../hooks/useAudit';
import adminLogo from '../assets/admin-logo.png';

const UserCogIcon = ({ size = 12, color = '#ffffff' }) => (
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

const AdminIcon = ({ size = 12 }) => (
  <img
    src={adminLogo}
    alt="Administrator"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      display: 'inline-block',
      verticalAlign: 'middle',
      marginRight: '0.35rem',
      flexShrink: 0,
      filter: 'brightness(0) invert(1)',
      imageRendering: '-webkit-optimize-contrast',
    }}
  />
);

const AuditLogs = () => {
  const { hasPermission, user: currentUser } = useAuthStore();
  const containerRef = useRef(null);

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState(null);

  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
  const actionDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(e.target)) {
        setIsActionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch users for admin role lookup
  const { data: usersData } = useQuery({
    queryKey: ['users-lookup-audit'],
    queryFn: async () => {
      try {
        const res = await api.get('/users', { params: { limit: 100 } });
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { superAdminEmails, adminEmails } = useMemo(() => {
    const superSet = new Set();
    const adminSet = new Set();
    if (currentUser?.email) {
      const currentRoleNames = (Array.isArray(currentUser.roles) ? currentUser.roles : []).map((r) =>
        typeof r === 'string' ? r.toLowerCase() : (r?.name || '').toLowerCase()
      );
      if (currentRoleNames.some((r) => r.includes('super_admin') || r.includes('superadmin'))) {
        superSet.add(currentUser.email.toLowerCase());
      } else if (currentRoleNames.some((r) => r.includes('admin'))) {
        adminSet.add(currentUser.email.toLowerCase());
      }
    }
    if (usersData && Array.isArray(usersData)) {
      usersData.forEach((u) => {
        if (!u.email) return;
        const roleNames = Array.isArray(u.roles)
          ? u.roles.map((r) => (typeof r === 'string' ? r.toLowerCase() : (r?.name || '').toLowerCase()))
          : [];
        if (roleNames.some((r) => r.includes('super_admin') || r.includes('superadmin'))) {
          superSet.add(u.email.toLowerCase());
        } else if (roleNames.some((r) => r.includes('admin'))) {
          adminSet.add(u.email.toLowerCase());
        }
      });
    }
    return { superAdminEmails: superSet, adminEmails: adminSet };
  }, [usersData, currentUser]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { page, action: actionFilter, resourceType: resourceTypeFilter, startDate, endDate }],
    queryFn: async () => {
      const params = { page, limit: 15 };
      if (actionFilter) params.action = actionFilter;
      if (resourceTypeFilter) params.resource_type = resourceTypeFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await api.get('/audit', { params });
      return { logs: data.data || [], meta: data.meta || {} };
    },
    refetchInterval: 4000,
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

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setIntegrityResult(null);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await api.get('/audit/verify', { params });
      setIntegrityResult({
        valid: data.data?.valid ?? true,
        totalChecked: data.data?.totalChecked ?? data.data?.total_verified ?? 0,
        firstInvalid: data.data?.firstInvalid ?? null,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      setIntegrityResult({ valid: false, error: getErrorMessage(err), timestamp: new Date().toLocaleTimeString() });
    } finally {
      setIsVerifying(false);
    }
  };

  // Format resource string nicely (e.g. role:f63d79db-5c5b-4420-88b2-275f954e5ee5 -> ROLE · f63d79db)
  const formatResource = (resType, resId) => {
    if (!resType && !resId) return '—';
    const typeLabel = (resType || 'ITEM').toUpperCase();
    const shortId = resId ? (resId.length > 8 ? resId.substring(0, 8) : resId) : 'N/A';
    return `${typeLabel} · ${shortId}`;
  };

  const totalLogs = data?.meta?.total || (data?.logs?.length ?? 0);

  return (
    <div className="sirnik-page sirnik-grid-bg" ref={containerRef}>
      {/* ── Page Header & Cryptographic Telemetry Status ── */}
      <div className="sirnik-page-header sirnik-anim" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number">CRYPTOGRAPHIC CHECKSUM CHAIN</span>
            <h1 className="sirnik-page-title">
              Audit Trail
            </h1>
            <p className="mt-md" style={{ maxWidth: '480px' }}>
              Tamper-evident audit trail linking SHA-256 Merkle hashes sequentially to enforce non-repudiation and forensic provenance.
            </p>
          </div>

          {/* Right Side: Telemetry Box & Integrity Verification Trigger */}
          <div className="flex flex-col items-end gap-md">
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
                CHAIN TELEMETRY
              </div>
              <div className="font-mono text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>AUDITED RECORDS:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{totalLogs}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>HASH STANDARD:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>SHA-256</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>CHAIN STATUS:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>SEQUENTIAL</span>
                </div>
              </div>
            </div>

            {hasPermission('audit:verify') && (
              <button
                onClick={handleVerifyIntegrity}
                disabled={isVerifying}
                className="sirnik-action-box-btn"
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                {isVerifying ? 'VERIFYING CHAIN' : 'VERIFY SHA-256 INTEGRITY'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cryptographic Verification Report Box ── */}
      {integrityResult && (
        <div
          className="sirnik-anim mb-xl"
          style={{
            padding: '1.25rem 1.75rem',
            border: `1px solid ${integrityResult.valid ? 'rgba(255, 255, 255, 0.25)' : 'rgba(239, 68, 68, 0.4)'}`,
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderRadius: '2px',
          }}
        >
          <div>
            <div className="flex items-center gap-sm">
              <span
                style={{
                  color: integrityResult.valid ? '#ffffff' : 'var(--danger)',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  letterSpacing: '0.04em',
                }}
              >
                {integrityResult.valid ? 'SHA-256 MERKLE CHAIN INTEGRITY VALIDATED' : 'CHECKSUM TAMPERING DETECTED'}
              </span>
              <span className="sirnik-tag" style={{ fontSize: '0.62rem', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                {integrityResult.timestamp}
              </span>
            </div>
            <p className="text-xs font-mono mt-xs text-muted" style={{ margin: '0.35rem 0 0', lineHeight: 1.4 }}>
              {integrityResult.valid
                ? `Cryptographic signature chain verified across ${integrityResult.totalChecked || totalLogs} sequential log entries. Zero hash tampering detected.`
                : `Integrity failure identified at log sequence: ${integrityResult.firstInvalid || 'Unknown'}.`}
            </p>
          </div>

          <button
            onClick={() => setIntegrityResult(null)}
            className="sirnik-action-box-btn"
            style={{ fontSize: '0.68rem', padding: '0.35rem 0.75rem' }}
          >
            DISMISS REPORT
          </button>
        </div>
      )}

      {/* ── Query & Telemetry Filter Controls ── */}
      <div
        className="flex gap-md items-center mb-xl sirnik-anim flex-wrap"
        style={{ position: 'relative', zIndex: 100 }}
      >
        {/* Bespoke Dark Glassmorphic Action Dropdown */}
        <div style={{ position: 'relative', minWidth: '240px' }} ref={actionDropdownRef}>
          <div
            onClick={() => setIsActionDropdownOpen((prev) => !prev)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              border: `1px solid ${isActionDropdownOpen ? '#ffffff' : 'var(--line-strong)'}`,
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
              {actionFilter || 'ALL ACTION TYPES'}
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
                transform: isActionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                marginLeft: '0.5rem',
                opacity: 0.6,
                flexShrink: 0,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {isActionDropdownOpen && (
            <div
              className="sirnik-custom-dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                width: '100%',
                maxHeight: '260px',
                overflowY: 'auto',
                backgroundColor: '#0c0c0c',
                background: '#0c0c0c',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 24px 48px #000000, 0 0 0 1px rgba(255, 255, 255, 0.1)',
                zIndex: 9999,
                borderRadius: '2px',
              }}
            >
              <div
                onClick={() => {
                  setActionFilter('');
                  setPage(1);
                  setIsActionDropdownOpen(false);
                }}
                className="sirnik-dropdown-item font-mono"
                style={{
                  padding: '0.65rem 1rem',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  backgroundColor: actionFilter === '' ? 'rgba(255, 255, 255, 0.08)' : '#0c0c0c',
                  color: actionFilter === '' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: actionFilter === '' ? 700 : 400,
                }}
              >
                ALL ACTION TYPES
              </div>
              {AUDIT_ACTIONS.map((a) => {
                const isSelected = actionFilter === a;
                return (
                  <div
                    key={a}
                    onClick={() => {
                      setActionFilter(a);
                      setPage(1);
                      setIsActionDropdownOpen(false);
                    }}
                    className="sirnik-dropdown-item font-mono"
                    style={{
                      padding: '0.6rem 1rem',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : '#0c0c0c',
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                      fontWeight: isSelected ? 700 : 400,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{a}</span>
                    {isSelected && <span style={{ fontSize: '0.62rem', color: '#00FF66', fontWeight: 700 }}>● ACTIVE</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '320px' }}>
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
            placeholder="RESOURCE TYPE (e.g. user, role)"
            value={resourceTypeFilter}
            onChange={(e) => { setResourceTypeFilter(e.target.value); setPage(1); }}
          />
        </div>

        {(actionFilter || resourceTypeFilter || startDate || endDate) && (
          <button
            onClick={() => { setActionFilter(''); setResourceTypeFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}
            className="sirnik-action-box-btn"
            style={{ fontSize: '0.72rem', padding: '0.55rem 0.85rem' }}
          >
            CLEAR FILTERS
          </button>
        )}
      </div>

      {/* ── Audit Stream Data Table ── */}
      <div className="sirnik-anim">
        <table className="sirnik-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '20%', padding: '0.85rem 0.5rem' }}>ACTION</th>
              <th style={{ width: '24%', padding: '0.85rem 0.5rem' }}>ACTOR IDENTITY</th>
              <th style={{ width: '18%', padding: '0.85rem 0.5rem' }}>TARGET RESOURCE</th>
              <th style={{ width: '11%', padding: '0.85rem 0.5rem' }}>IP TELEMETRY</th>
              <th style={{ width: '12%', padding: '0.85rem 0.5rem' }}>SHA-256 HASH</th>
              <th style={{ width: '15%', padding: '0.85rem 0.5rem', textAlign: 'right' }}>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-muted py-4 font-mono text-center">
                  LOADING AUDIT CHAIN TELEMETRY
                </td>
              </tr>
            ) : data?.logs && data.logs.length > 0 ? (
              data.logs.map((log) => {
                const actorEmail = (log.actor_email || 'SYSTEM').toLowerCase();
                const isSuperAdminActor = superAdminEmails.has(actorEmail);
                const isAdminActor = !isSuperAdminActor && adminEmails.has(actorEmail);
                const cleanIp = log.ip_address ? log.ip_address.replace('::ffff:', '') : '127.0.0.1';
                const shortChecksum = log.checksum
                  ? `${log.checksum.substring(0, 8)}...${log.checksum.substring(log.checksum.length - 4)}`
                  : '—';
                const isLongAction = log.action && log.action.length > 20;

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    {/* Action Tag */}
                    <td style={{ padding: '1rem 0.5rem', whiteSpace: 'nowrap' }}>
                      <span
                        className="sirnik-tag"
                        style={{
                          fontSize: isLongAction ? '0.58rem' : '0.62rem',
                          letterSpacing: isLongAction ? '0.03em' : '0.04em',
                          borderColor: 'rgba(255, 255, 255, 0.18)',
                          color: '#ffffff',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: isLongAction ? '0.18rem 0.4rem' : '0.2rem 0.45rem',
                          display: 'inline-block',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Actor Identity */}
                    <td style={{ padding: '1rem 0.6rem', whiteSpace: 'nowrap' }}>
                      <div
                        className="font-mono text-xs"
                        style={{
                          color: '#ffffff',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`Actor ID: ${log.actor_id || 'system'}`}
                      >
                        {isSuperAdminActor ? (
                          <span title="Super Administrator">
                            <UserCogIcon size={12} color="#ffffff" />
                          </span>
                        ) : isAdminActor ? (
                          <span title="Administrator">
                            <AdminIcon size={12} />
                          </span>
                        ) : null}
                        <span>{log.actor_email || 'system'}</span>
                      </div>
                    </td>

                    {/* Target Resource */}
                    <td style={{ padding: '1rem 0.6rem', whiteSpace: 'nowrap' }}>
                      <span
                        className="font-mono text-xs"
                        style={{
                          color: 'var(--text-muted)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '0.2rem 0.45rem',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '2px',
                          display: 'inline-block',
                        }}
                        title={`Full Resource: ${log.resource_type}:${log.resource_id || 'N/A'}`}
                      >
                        {formatResource(log.resource_type, log.resource_id)}
                      </span>
                    </td>

                    {/* IP Telemetry */}
                    <td style={{ padding: '1rem 0.6rem', whiteSpace: 'nowrap' }}>
                      <span className="font-mono text-xs text-muted">{cleanIp}</span>
                    </td>

                    {/* SHA-256 Hash */}
                    <td style={{ padding: '1rem 0.6rem', whiteSpace: 'nowrap' }}>
                      <span
                        className="font-mono text-xs"
                        style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                        }}
                        title={`Full SHA-256: ${log.checksum || 'N/A'}`}
                      >
                        {shortChecksum}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td style={{ padding: '1rem 0.6rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span className="font-mono text-xs text-muted" style={{ fontSize: '0.72rem' }}>
                        {log.created_at
                          ? new Date(log.created_at).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                          }) +
                          ' ' +
                          new Date(log.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                          : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.76rem',
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  [ ZERO AUDIT TRAIL ENTRIES MATCHED SPECIFIED QUERY CRITERIA ]
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {data?.meta && (
          <div className="flex justify-between items-center mt-2xl pt-md flex-wrap gap-md" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="sirnik-meta font-mono text-xs">
              SHOWING {data.logs?.length || 0} OF {data.meta.total || totalLogs} AUDITED EVENTS
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
    </div>
  );
};

export default AuditLogs;
