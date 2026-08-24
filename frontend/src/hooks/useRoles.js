import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Hook — fetch all roles.
 */
export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles');
      return data.data.roles;
    },
  });
};

/**
 * Hook — fetch single role by ID with permissions.
 */
export const useRole = (roleId) => {
  return useQuery({
    queryKey: ['role', roleId],
    queryFn: async () => {
      const { data } = await api.get(`/roles/${roleId}`);
      return data.data.role;
    },
    enabled: !!roleId,
  });
};

/**
 * Hook — fetch all available permissions.
 */
export const usePermissions = () => {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get('/roles/permissions');
      return data.data.permissions;
    },
  });
};
