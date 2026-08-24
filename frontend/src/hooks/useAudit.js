import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Hook — fetch paginated audit logs with filtering.
 */
export const useAuditLogs = ({
  page = 1,
  limit = 20,
  action = '',
  actorId = '',
  resourceType = '',
  startDate = '',
  endDate = '',
} = {}) => {
  return useQuery({
    queryKey: ['audit-logs', { page, limit, action, actorId, resourceType, startDate, endDate }],
    queryFn: async () => {
      const params = { page, limit };
      if (action) params.action = action;
      if (actorId) params.actor_id = actorId;
      if (resourceType) params.resource_type = resourceType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await api.get('/audit', { params });
      return { logs: data.data, meta: data.meta };
    },
  });
};

/**
 * Hook — verify audit log integrity.
 */
export const useAuditIntegrity = ({ startDate, endDate, enabled = false } = {}) => {
  return useQuery({
    queryKey: ['audit-integrity', { startDate, endDate }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await api.get('/audit/verify', { params });
      return data.data;
    },
    enabled,
  });
};

/**
 * All audit action types (from backend constants).
 */
export const AUDIT_ACTIONS = [
  'USER_REGISTERED',
  'USER_LOGIN',
  'USER_LOGIN_FAILED',
  'USER_LOGOUT',
  'USER_UPDATED',
  'USER_DELETED',
  'USER_LOCKED',
  'USER_UNLOCKED',
  'PASSWORD_CHANGED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'MFA_ENABLED',
  'MFA_DISABLED',
  'MFA_VERIFIED',
  'ROLE_CREATED',
  'ROLE_UPDATED',
  'ROLE_DELETED',
  'ROLE_ASSIGNED',
  'ROLE_REMOVED',
  'PERMISSION_ASSIGNED',
  'PERMISSION_REMOVED',
  'TOKEN_REVOKED',
  'TOKEN_REFRESHED',
];

/**
 * Map audit actions to badge color types.
 */
export const getActionBadgeType = (action) => {
  const successActions = ['USER_REGISTERED', 'USER_LOGIN', 'USER_LOGOUT', 'MFA_ENABLED', 'MFA_VERIFIED', 'ROLE_CREATED', 'ROLE_ASSIGNED', 'PERMISSION_ASSIGNED'];
  const dangerActions = ['USER_LOGIN_FAILED', 'USER_DELETED', 'USER_LOCKED', 'MFA_DISABLED', 'ROLE_DELETED', 'ROLE_REMOVED', 'PERMISSION_REMOVED', 'TOKEN_REVOKED'];
  const warningActions = ['PASSWORD_RESET_REQUESTED', 'PASSWORD_CHANGED', 'USER_UNLOCKED'];

  if (successActions.includes(action)) return 'success';
  if (dangerActions.includes(action)) return 'danger';
  if (warningActions.includes(action)) return 'warning';
  return 'default';
};
