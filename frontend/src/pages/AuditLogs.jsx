import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import { AUDIT_ACTIONS, getActionBadgeType } from '../hooks/useAudit';

const AuditLogs = () => {
  const { hasPermission } = useAuthStore();
  const containerRef = useRef(null);

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', { page, action: actionFilter, resourceType: resourceTypeFilter, startDate, endDate }],
    queryFn: async () => {
      const params = { page, limit: 15 };
      if (actionFilter) params.action = actionFilter;
      if (resourceTypeFilter) params.resource_type = resourceTypeFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await api.get('/audit', { params });
      return { logs: data.data, meta: data.meta };
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

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setIntegrityResult(null);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await api.get('/audit/verify', { params });
      setIntegrityResult(data.data);
    } catch (err) {
      setIntegrityResult({ valid: false, error: getErrorMessage(err) });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="sirnik-page" ref={containerRef}>
      <div className="sirnik-page-header sirnik-anim">
        <div className="flex justify-between items-end">
          <div>
            <span className="sirnik-page-number">04 · CRYPTOGRAPHIC CHECKSUM CHAIN</span>
            <h1 className="sirnik-page-title">
              Audit<br />Trail.
            </h1>
            <p className="mt-md" style={{ maxWidth: '460px' }}>
              Tamper-evident log chain linking SHA-256 signatures sequentially.
            </p>
          </div>
          {hasPermission('audit:verify') && (
            <button onClick={handleVerifyIntegrity} disabled={isVerifying} className="sirnik-btn-solid">
              {isVerifying ? 'VERIFYING CHAIN...' : 'VERIFY SHA-256 INTEGRITY →'}
            </button>
          )}
        </div>
      </div>

      {/* Verification Result Notification */}
      {integrityResult && (
        <div
          className="sirnik-anim mb-xl"
          style={{
            padding: '1.5rem',
            border: `1px solid ${integrityResult.valid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            background: integrityResult.valid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div className="font-bold text-lg" style={{ color: integrityResult.valid ? '#10b981' : '#ef4444' }}>
              {integrityResult.valid ? '✓ CHAIN INTEGRITY VALIDATED' : '🚨 CHECKSUM MISMATCH DETECTED'}
            </div>
            <p className="text-xs font-mono mt-xs text-muted">
              {integrityResult.valid
                ? `Successfully re-hashed ${integrityResult.totalChecked} audit entries. Zero tampering detected.`
                : `Tampering detected at log entry ID: ${integrityResult.firstInvalid}`}
            </p>
          </div>
          <button onClick={() => setIntegrityResult(null)} className="sirnik-btn" style={{ padding: 0 }}>
            <span>DISMISS</span>
          </button>
        </div>
      )}

      {/* Query Filters */}
      <div className="flex gap-lg items-center mb-2xl sirnik-anim" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1.5rem' }}>
        <select
          className="sirnik-input"
          style={{ width: '220px', padding: '0.5rem 0', background: 'transparent' }}
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
        >
          <option value="" style={{ background: '#000' }}>ALL ACTIONS</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a} style={{ background: '#000' }}>{a}</option>
          ))}
        </select>

        <input
          type="text"
          className="sirnik-input"
          style={{ maxWidth: '240px', padding: '0.5rem 0' }}
          placeholder="RESOURCE TYPE (e.g. user)"
          value={resourceTypeFilter}
          onChange={(e) => { setResourceTypeFilter(e.target.value); setPage(1); }}
        />

        {(actionFilter || resourceTypeFilter || startDate || endDate) && (
          <button
            onClick={() => { setActionFilter(''); setResourceTypeFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}
            className="sirnik-btn"
            style={{ padding: 0 }}
          >
            <span>CLEAR FILTERS</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="sirnik-anim">
        <table className="sirnik-table">
          <thead>
            <tr>
              <th>ACTION</th>
              <th>ACTOR IDENTITY</th>
              <th>TARGET RESOURCE</th>
              <th>IP TELEMETRY</th>
              <th>SHA-256 CHECKSUM</th>
              <th style={{ textAlign: 'right' }}>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-muted py-4 font-mono">LOADING AUDIT STREAM...</td>
              </tr>
            ) : data?.logs && data.logs.length > 0 ? (
              data.logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className={`sirnik-tag sirnik-tag-${getActionBadgeType(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="font-mono text-sm">{log.actor_email || 'system'}</td>
                  <td className="font-mono text-muted text-xs">
                    {log.resource_type ? `${log.resource_type}:${log.resource_id || ''}` : '—'}
                  </td>
                  <td className="font-mono text-muted text-xs">{log.ip_address || '127.0.0.1'}</td>
                  <td className="font-mono text-xs text-muted" title={log.checksum}>
                    {log.checksum ? `${log.checksum.substring(0, 14)}...` : '—'}
                  </td>
                  <td className="font-mono text-muted text-xs" style={{ textAlign: 'right' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-muted py-4 font-mono">NO RECORDS MATCHED FILTER</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.meta && (
          <div className="flex justify-between items-center mt-2xl pt-md" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="sirnik-meta">SHOWING {data.logs?.length || 0} OF {data.meta.total} EVENTS</span>
            <div className="flex gap-md items-center">
              <button className="sirnik-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <span>← PREV</span>
              </button>
              <span className="font-mono text-xs text-muted">PAGE {data.meta.page} OF {data.meta.totalPages || 1}</span>
              <button className="sirnik-btn" disabled={page >= (data.meta.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>
                <span>NEXT →</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
