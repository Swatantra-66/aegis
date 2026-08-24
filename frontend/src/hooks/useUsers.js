import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Hook — fetch paginated user list.
 */
export const useUsers = ({ page = 1, limit = 20, search = '', isActive } = {}) => {
  return useQuery({
    queryKey: ['users', { page, limit, search, isActive }],
    queryFn: async () => {
      const params = { page, limit };
      if (search) params.search = search;
      if (isActive !== undefined && isActive !== '') params.is_active = isActive;

      const { data } = await api.get('/users', { params });
      return { users: data.data, meta: data.meta };
    },
  });
};

/**
 * Hook — fetch single user by ID.
 */
export const useUser = (userId) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${userId}`);
      return data.data.user;
    },
    enabled: !!userId,
  });
};

/**
 * Hook — fetch current user profile.
 */
export const useMe = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data.data.user;
    },
  });
};
