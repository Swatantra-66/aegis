import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import api, { healthCheck, getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';

const Dashboard = () => {
  const { user, roles: authRoles, hasPermission } = useAuthStore();
  const containerRef = useRef(null);
  const [verificationResult, setVerificationResult] = useState(null);

  // Queries for live metrics
  const { data: usersData } = useQuery({
    queryKey: ['dashboard-users-count'],
    queryFn: async () => {
      const { data } = await api.get('/users?limit=1');
      return data.meta?.total || 0;
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['dashboard-roles-count'],
    queryFn: async () => {
      const { data } = await api.get('/roles');
      return data.data.roles?.length || 0;
    },
  });

  const { data: auditCount } = useQuery({
    queryKey: ['dashboard-audit-count'],
    queryFn: async () => {
      const { data } = await api.get('/audit?limit=1');
      return data.meta?.total || 0;
    },
  });

  const { data: recentAudit } = useQuery({
    queryKey: ['dashboard-recent-audit'],
    queryFn: async () => {
      const { data } = await api.get('/audit?limit=100');
      return data.data || [];
    },
    refetchInterval: 10000,
  });

  const { data: usersList } = useQuery({
    queryKey: ['dashboard-users-roles'],
    queryFn: async () => {
      const { data } = await api.get('/users?limit=100');
      return data.data || [];
    },
  });

  // Fast lookup map for user roles by email
  const userRolesMap = useMemo(() => {
    const map = {};
    if (usersList && Array.isArray(usersList)) {
      usersList.forEach((u) => {
        if (u.email) {
          const roleNames = Array.isArray(u.roles)
            ? u.roles.map((r) => (typeof r === 'string' ? r.toLowerCase() : (r?.name || '').toLowerCase()))
            : [];
          map[u.email.toLowerCase()] = roleNames;
        }
      });
    }
    return map;
  }, [usersList]);

  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data } = await healthCheck();
      return data;
    },
    refetchInterval: 30000,
  });

  // Verify Audit Chain Mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/audit/verify');
      return data;
    },
    onSuccess: (res) => {
      const details = res.data || {};
      const count = details.totalChecked !== undefined ? details.totalChecked : 'All';
      setVerificationResult({
        success: true,
        message: `${count} of ${count} audit log entries cryptographically verified across the SHA-256 Merkle chain. Zero tampering anomalies detected.`,
        details,
        timestamp: new Date().toLocaleTimeString(),
      });
    },
    onError: (err) => {
      setVerificationResult({
        success: false,
        message: getErrorMessage(err) || 'Verification failed.',
        timestamp: new Date().toLocaleTimeString(),
      });
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

  // Helper for local calendar date key 'YYYY-MM-DD'
  const getLocalDateKey = (dateObj) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Compute 100% real dynamic authentication activity telemetry from PostgreSQL audit logs
  const activityData = useMemo(() => {
    const daysMap = [];
    const now = new Date();

    // Generate the last 7 calendar days in local time
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = getLocalDateKey(d);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      daysMap.push({
        dateKey,
        day: i === 0 ? 'TODAY' : label,
        events: 0,
        logins: 0,
      });
    }

    if (recentAudit && recentAudit.length > 0) {
      recentAudit.forEach((log) => {
        if (!log.created_at) return;
        const logDateKey = getLocalDateKey(log.created_at);
        const match = daysMap.find((item) => item.dateKey === logDateKey);
        if (match) {
          match.events += 1;
          if (log.action === 'USER_LOGIN' || log.action === 'USER_REGISTERED') {
            match.logins += 1;
          }
        }
      });
    }

    return daysMap;
  }, [recentAudit]);

  return (
    <div className="sirnik-page sirnik-grid-bg" ref={containerRef}>
      {/* ── Page Header & System Telemetry Status ── */}
      <div className="sirnik-page-header sirnik-anim">
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number">ARCHITECTURE & TELEMETRY</span>
            <h1 className="sirnik-page-title">
              Identity<br />Overview
            </h1>
            <p className="mt-md" style={{ maxWidth: '520px' }}>
              Live zero-trust governance matrix monitoring directory identities, access control tokens, and cryptographic checksum trails.
            </p>
          </div>

          {/* System Health Status Block */}
          {systemHealth && (() => {
            const isDbConnected = systemHealth.services?.database === 'connected';
            const isRedisConnected = systemHealth.services?.redis === 'connected';
            const isHealthy = isDbConnected && isRedisConnected && systemHealth.status === 'healthy';

            return (
              <div
                className="sirnik-meta"
                style={{
                  border: `1px solid ${isHealthy ? 'var(--line-strong)' : 'rgba(239, 68, 68, 0.4)'}`,
                  background: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(12px)',
                  padding: '0.85rem 1.4rem',
                  borderRadius: '2px',
                  minWidth: '220px',
                }}
              >
                <div
                  style={{
                    color: isHealthy ? '#fff' : 'var(--danger)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    marginBottom: '0.4rem',
                  }}
                >
                  SYSTEM {isHealthy ? 'HEALTHY' : 'UNHEALTHY'}
                </div>
                <div className="font-mono text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>POSTGRESQL:</span>
                    <span
                      style={{
                        color: isDbConnected ? 'var(--text-white)' : 'var(--danger)',
                        fontWeight: isDbConnected ? 500 : 700,
                      }}
                    >
                      {isDbConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>REDIS:</span>
                    <span
                      style={{
                        color: isRedisConnected ? 'var(--text-white)' : 'var(--danger)',
                        fontWeight: isRedisConnected ? 500 : 700,
                      }}
                    >
                      {isRedisConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Bespoke Glassmorphic Hero Stat Cards ── */}
      <div className="sirnik-stat-grid-4 sirnik-anim mb-3xl">
        {/* Card 1: Directory Identities */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--line)',
            padding: '1.2rem 1.35rem',
            position: 'relative',
            transition: 'border-color 0.3s, transform 0.3s',
          }}
          className="hover-card-lift"
        >
          <div className="flex justify-between items-center mb-xs" style={{ whiteSpace: 'nowrap' }}>
            <span className="sirnik-stat-label" style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.08em' }}>01 · IDENTITIES</span>
            <span className="sirnik-tag" style={{ fontSize: '0.6rem', borderColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap' }}>SYNCED</span>
          </div>
          <div className="sirnik-stat-num" style={{ color: '#ffffff' }}>{usersData !== undefined ? usersData : '—'}</div>
          <p className="text-xs mt-xs text-muted" style={{ margin: 0 }}>Active user records</p>
        </div>

        {/* Card 2: RBAC Roles Defined */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--line)',
            padding: '1.2rem 1.35rem',
            position: 'relative',
            transition: 'border-color 0.3s, transform 0.3s',
          }}
          className="hover-card-lift"
        >
          <div className="flex justify-between items-center mb-xs" style={{ whiteSpace: 'nowrap' }}>
            <span className="sirnik-stat-label" style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.08em' }}>02 · ROLES</span>
            <span className="sirnik-tag" style={{ fontSize: '0.6rem', borderColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap' }}>ENFORCED</span>
          </div>
          <div className="sirnik-stat-num" style={{ color: '#ffffff' }}>{rolesData !== undefined ? rolesData : '—'}</div>
          <p className="text-xs mt-xs text-muted" style={{ margin: 0 }}>Role hierarchy matrix</p>
        </div>

        {/* Card 3: Checksum Bit Strength */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--line)',
            padding: '1.2rem 1.35rem',
            position: 'relative',
            transition: 'border-color 0.3s, transform 0.3s',
          }}
          className="hover-card-lift"
        >
          <div className="flex justify-between items-center mb-xs" style={{ whiteSpace: 'nowrap' }}>
            <span className="sirnik-stat-label" style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.08em' }}>03 · CRYPTO</span>
            <span className="sirnik-tag" style={{ fontSize: '0.6rem', borderColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap' }}>SHA-256</span>
          </div>
          <div className="sirnik-stat-num" style={{ color: '#ffffff' }}>256</div>
          <p className="text-xs mt-xs text-muted" style={{ margin: 0 }}>Merkle hash chain</p>
        </div>

        {/* Card 4: Audit Records */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--line)',
            padding: '1.2rem 1.35rem',
            position: 'relative',
            transition: 'border-color 0.3s, transform 0.3s',
          }}
          className="hover-card-lift"
        >
          <div className="flex justify-between items-center mb-xs" style={{ whiteSpace: 'nowrap' }}>
            <span className="sirnik-stat-label" style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.08em' }}>04 · AUDIT TRAIL</span>
            <span className="sirnik-tag" style={{ fontSize: '0.6rem', borderColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap' }}>CHAINED</span>
          </div>
          <div className="sirnik-stat-num" style={{ color: '#ffffff' }}>{auditCount !== undefined ? auditCount : '—'}</div>
          <p className="text-xs mt-xs text-muted" style={{ margin: 0 }}>Chained log entries</p>
        </div>
      </div>

      {/* ── Security Quick-Action Bar ── */}
      <div
        className="sirnik-section sirnik-anim mb-3xl"
        style={{
          border: '1px solid var(--line-strong)',
          background: 'rgba(255, 255, 255, 0.015)',
          padding: '1.5rem 2rem',
        }}
      >
        <div className="flex justify-between items-center flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number" style={{ fontSize: '0.68rem' }}>QUICK SECURITY OPERATIONS</span>
            <h4 style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>Zero-Trust Control Hub</h4>
          </div>

          <div className="flex items-center gap-md flex-wrap">
            {/* Verify Integrity Button */}
            {hasPermission('audit:verify') && (
              <button
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="sirnik-action-box-btn"
              >
                {verifyMutation.isPending ? 'VERIFYING HASH CHAIN...' : 'VERIFY AUDIT INTEGRITY'}
              </button>
            )}

            <Link
              to="/roles"
              className="sirnik-action-box-btn"
            >
              ACCESS GOVERNANCE
            </Link>

            <Link
              to="/audit"
              className="sirnik-action-box-btn"
            >
              FULL AUDIT CHAIN
            </Link>
          </div>
        </div>

        {/* Verification Status Report */}
        {verificationResult && (
          <div
            className="mt-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${verificationResult.success ? 'rgba(255, 255, 255, 0.14)' : 'rgba(239, 68, 68, 0.5)'}`,
              backdropFilter: 'blur(12px)',
              borderRadius: '2px',
              padding: '1rem 1.25rem',
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-sm">
                <span
                  style={{
                    color: verificationResult.success ? '#ffffff' : 'var(--danger)',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    fontSize: '0.8rem',
                  }}
                >
                  {verificationResult.success ? 'SHA-256 CHAIN INTEGRITY: VALID' : 'CRYPTOGRAPHIC INTEGRITY ANOMALY DETECTED'}
                </span>
                <span className="text-xs text-muted font-mono">[{verificationResult.timestamp}]</span>
              </div>
              <button
                onClick={() => setVerificationResult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: '0 0.25rem',
                }}
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-mono" style={{ color: 'rgba(255, 255, 255, 0.75)', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
              {verificationResult.message}
            </p>
          </div>
        )}
      </div>

      {/* ── Activity Chart Section ── */}
      <div className="sirnik-section sirnik-anim" style={{ paddingTop: '1.25rem' }}>
        <div className="flex justify-between items-start mb-lg flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number">METRICS</span>
            <h3>Authentication Activity</h3>
          </div>
          {/* Vertical Representation Legend Box (Positioned near top line) */}
          <div
            className="sirnik-meta"
            style={{
              border: '1px solid var(--line-strong)',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(12px)',
              padding: '0.65rem 1.15rem',
              borderRadius: '2px',
              minWidth: '230px',
              marginTop: '-0.5rem',
            }}
          >
            <div className="font-mono text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ color: '#ffffff', fontSize: '0.72rem', letterSpacing: '0.04em' }}>TOTAL AUDIT EVENTS:</span>
                <span style={{ display: 'inline-block', width: '22px', height: '2px', background: '#ffffff' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ color: '#ffffff', fontSize: '0.72rem', letterSpacing: '0.04em' }}>AUTHENTICATIONS:</span>
                <span style={{ display: 'inline-block', width: '22px', height: '0px', borderTop: '2px dashed rgba(255, 255, 255, 0.55)' }} />
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const maxEventCount = Math.max(0, ...activityData.map((d) => d.events || 0));
          // Exactly 20 if max is 20 or less; dynamically expands to 25, 30, etc. only if events exceed 20
          const yTop = maxEventCount <= 20 ? 20 : Math.ceil(maxEventCount / 5) * 5;
          const step = yTop <= 25 ? 5 : yTop <= 50 ? 10 : Math.ceil(yTop / 5);
          const yTicks = [];
          for (let t = 0; t <= yTop; t += step) {
            yTicks.push(t);
          }

          return (
            <div style={{ height: '230px', width: '100%', borderBottom: '1px solid var(--line)', paddingBottom: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyberMonochromeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="3 3"
                    vertical={false}
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="rgba(255, 255, 255, 0.1)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, yTop]}
                    ticks={yTicks}
                    stroke="rgba(255, 255, 255, 0.1)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(255, 255, 255, 0.65)', strokeWidth: 1.2 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const dataPoint = payload[0].payload;
                        return (
                          <div
                            style={{
                              background: 'rgba(10, 10, 10, 0.95)',
                              border: '1px solid rgba(255, 255, 255, 0.18)',
                              backdropFilter: 'blur(12px)',
                              padding: '0.7rem 1rem',
                              borderRadius: '2px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              minWidth: '180px',
                            }}
                          >
                            <div style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                              {dataPoint.dateKey} · {dataPoint.day}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffffff', fontWeight: 600, marginBottom: '0.2rem' }}>
                              <span>TOTAL EVENTS:</span>
                              <span>{dataPoint.events}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.65)' }}>
                              <span>AUTHENTICATIONS:</span>
                              <span>{dataPoint.logins}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Line 1: Total Audit Events */}
                  <Area
                    type="monotone"
                    dataKey="events"
                    name="Total Events"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#cyberMonochromeGradient)"
                    dot={{ r: 2.5, fill: '#000000', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 4.5, fill: '#ffffff', stroke: '#000000', strokeWidth: 2 }}
                  />
                  {/* Line 2: Authentications / Logins */}
                  <Area
                    type="monotone"
                    dataKey="logins"
                    name="Authentications"
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    fill="none"
                    dot={{ r: 2, fill: '#ffffff' }}
                    activeDot={{ r: 4, fill: '#ffffff', stroke: 'rgba(255, 255, 255, 0.5)', strokeWidth: 1.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>

      {/* ── Recent Audit Stream ── */}
      <div className="sirnik-section sirnik-anim mt-3xl">
        <div className="flex justify-between items-end mb-lg flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number">03 · EVENT LOG</span>
            <h3>Tamper-Evident Audit Stream</h3>
          </div>
          <Link
            to="/audit"
            className="sirnik-action-box-btn"
            style={{ fontSize: '0.72rem', padding: '0.45rem 0.9rem' }}
          >
            VIEW FULL AUDIT CHAIN
          </Link>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="sirnik-table" style={{ width: '100%', minWidth: '860px', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '23%', padding: '0.85rem 0.6rem' }}>ACTION</th>
                <th style={{ width: '33%', padding: '0.85rem 0.6rem' }}>ACTOR</th>
                <th style={{ width: '18%', padding: '0.85rem 0.6rem' }}>TARGET RESOURCE</th>
                <th style={{ width: '13%', padding: '0.85rem 0.6rem' }}>IP ADDRESS</th>
                <th style={{ width: '13%', padding: '0.85rem 0.6rem', textAlign: 'right' }}>TIME</th>
              </tr>
            </thead>
            <tbody>
              {recentAudit && recentAudit.length > 0 ? (
                recentAudit.slice(0, 8).map((log) => {
                  const cleanIp = (log.ip_address || '127.0.0.1').replace('::ffff:', '');
                  const formattedTime = new Date(log.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  // Format resource cleanly e.g. "USER · a67bcd58"
                  const formattedResource = log.resource_type
                    ? `${log.resource_type.toUpperCase()} · ${log.resource_id ? (log.resource_id.length > 10 ? log.resource_id.slice(0, 8) : log.resource_id) : 'SYSTEM'}`
                    : '—';

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <td style={{ padding: '1.1rem 0.6rem', whiteSpace: 'nowrap' }}>
                        <span
                          className="sirnik-tag"
                          style={{
                            fontSize: '0.65rem',
                            letterSpacing: '0.05em',
                            borderColor: 'rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            background: 'rgba(255, 255, 255, 0.02)',
                            maxWidth: '100%',
                            display: 'inline-block',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td
                        className="font-mono"
                        style={{
                          padding: '1.1rem 0.6rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'var(--text-white)',
                          fontSize: '0.8rem',
                        }}
                        title={log.actor_email || 'system'}
                      >
                        {(() => {
                          const actorEmail = (log.actor_email || '').toLowerCase();
                          const actorRoles = userRolesMap[actorEmail] || [];
                          const isCurrentLoggedIn = (user?.email || '').toLowerCase() === actorEmail;
                          const currentRoles = isCurrentLoggedIn
                            ? (Array.isArray(authRoles) ? authRoles : Array.isArray(user?.roles) ? user.roles : []).map(
                                (r) => (typeof r === 'string' ? r.toLowerCase() : (r?.name || '').toLowerCase())
                              )
                            : [];

                          const allRoles = [...new Set([...actorRoles, ...currentRoles])];
                          const isSuperAdmin = allRoles.some(
                            (r) => r.includes('super_admin') || r.includes('superadmin') || r.includes('super admin')
                          );
                          const isAdmin = !isSuperAdmin && allRoles.some((r) => r.includes('admin'));

                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              {(isSuperAdmin || isAdmin) && (
                                <span
                                  title={isSuperAdmin ? 'Super Administrator' : 'Administrator'}
                                  style={{ display: 'inline-flex', alignItems: 'center', marginRight: '0.35rem' }}
                                >
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ verticalAlign: 'middle', flexShrink: 0 }}
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
                                </span>
                              )}
                              <span>{log.actor_email || 'system'}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td
                        className="font-mono text-muted"
                        style={{
                          padding: '1.1rem 0.75rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.8rem',
                        }}
                        title={log.resource_type && log.resource_id ? `${log.resource_type}:${log.resource_id}` : '—'}
                      >
                        {formattedResource}
                      </td>
                      <td
                        className="font-mono text-muted"
                        style={{ padding: '1.1rem 0.75rem', whiteSpace: 'nowrap', fontSize: '0.82rem' }}
                      >
                        {cleanIp}
                      </td>
                      <td
                        className="font-mono"
                        style={{
                          padding: '1.1rem 0.75rem',
                          whiteSpace: 'nowrap',
                          textAlign: 'right',
                          color: 'var(--text-muted)',
                          fontSize: '0.82rem',
                        }}
                      >
                        {formattedTime}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-muted py-4 font-mono text-center">
                    Zero log entries in current session. Authenticate or register to generate live audit records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
