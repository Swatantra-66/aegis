import { create } from 'zustand';
import axios from 'axios';
import api, { getErrorMessage } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Safely decode a JWT payload without verification.
 * Used client-side only to extract roles/permissions from the signed token.
 */
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
};

let isFetchingUser = false;

/**
 * Zustand auth store — manages authentication state, user info, roles, and permissions.
 * Persists tokens to localStorage. User data fetched fresh on init.
 */
const useAuthStore = create((set, get) => ({
  // State
  user: null,
  roles: [],
  permissions: [],
  accessToken: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,

  // MFA state (for login flow)
  mfaRequired: false,
  mfaPendingCredentials: null,

  /**
   * Register — create new user identity and automatically log in.
   */
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/register', userData);
      // Automatically log in after registration
      return await get().login(userData.email, userData.password);
    } catch (error) {
      const serverMsg = error.response?.data?.message || '';
      let friendlyError;
      if (error.response?.status === 409 || serverMsg.toLowerCase().includes('already exists')) {
        friendlyError = 'An account with this email already exists.';
      } else {
        friendlyError = getErrorMessage(error);
      }
      set({
        isLoading: false,
        error: friendlyError,
      });
      throw error;
    }
  },

  /**
   * Login — authenticate with email/password.
   * May return mfa_required: true if user has MFA enabled.
   */
  login: async (email, password, remember_me = false) => {
    set({ isLoading: true, error: null, mfaRequired: false });
    try {
      const { data } = await api.post('/auth/login', { email, password, remember_me });

      if (data.data.mfa_required) {
        set({
          mfaRequired: true,
          mfaPendingCredentials: { email, password, remember_me },
          isLoading: false,
        });
        return { mfaRequired: true };
      }

      const { user, access_token, refresh_token } = data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Decode JWT to extract roles and permissions baked into the token
      const claims = parseJwt(access_token);

      set({
        user,
        roles: claims.roles || user.roles || [],
        permissions: claims.permissions || [],
        accessToken: access_token,
        refreshToken: refresh_token,
        isAuthenticated: true,
        isLoading: false,
        mfaRequired: false,
        mfaPendingCredentials: null,
      });

      return { mfaRequired: false };
    } catch (error) {
      const status = error.response?.status;
      const serverMsg = error.response?.data?.message || '';

      let friendlyError;
      if (status === 404 || serverMsg.toLowerCase().includes('not found') || serverMsg.toLowerCase().includes('no user')) {
        friendlyError = 'No account found with this email.';
      } else if (serverMsg.toLowerCase().includes('deactivated')) {
        friendlyError = 'Account has been deactivated.';
      } else if (serverMsg.toLowerCase().includes('locked')) {
        friendlyError = serverMsg || 'Account locked. Please try again later.';
      } else if (status === 401 || serverMsg.toLowerCase().includes('invalid') || serverMsg.toLowerCase().includes('incorrect') || serverMsg.toLowerCase().includes('password')) {
        friendlyError = 'Invalid email address or password.';
      } else if (status === 429) {
        friendlyError = 'Too many attempts. Please try again later.';
      } else if (status === 400) {
        friendlyError = serverMsg || 'Invalid input provided.';
      } else if (!status || status >= 500) {
        friendlyError = 'Authentication service temporarily unavailable.';
      } else {
        friendlyError = getErrorMessage(error);
      }

      set({ isLoading: false, error: friendlyError });
      throw error;
    }
  },

  /**
   * MFA Login — validate TOTP code and complete login with credentials.
   */
  loginWithMfa: async (code) => {
    const credentials = get().mfaPendingCredentials;
    if (!credentials) throw new Error('No pending MFA login');

    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', {
        ...credentials,
        mfa_code: code,
      });

      const { user, access_token, refresh_token } = data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Decode JWT to extract roles and permissions baked into the token
      const claims = parseJwt(access_token);

      set({
        user,
        roles: claims.roles || user.roles || [],
        permissions: claims.permissions || [],
        accessToken: access_token,
        refreshToken: refresh_token,
        isAuthenticated: true,
        isLoading: false,
        mfaRequired: false,
        mfaPendingCredentials: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },

  /**
   * Logout — revoke tokens and clear state.
   */
  logout: async () => {
    const refreshToken = get().refreshToken;
    try {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch {
      // Logout should always succeed on client side
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('aegis_remember_email');
    localStorage.removeItem('aegis_remember_expiry');

    set({
      user: null,
      roles: [],
      permissions: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      mfaRequired: false,
      mfaPendingCredentials: null,
    });
  },

  /**
   * Fetch current user profile — called on app init, focus, and periodic sync.
   * Compares DB roles with store roles; if roles changed, silently rotates
   * the JWT access token to get fresh claims, and always updates the store
   * with the true roles and permissions from the database.
   */
  fetchUser: async () => {
    if (isFetchingUser) return;
    isFetchingUser = true;

    try {
      // Step 1: Fetch full user profile from database (the source of truth)
      const { data } = await api.get('/users/me');
      const user = data.data.user;

      const dbRoles = user.roles?.map((r) => (typeof r === 'string' ? r : r.name)) || [];
      const dbPermissions = user.permissions?.map((p) => (typeof p === 'string' ? p : p.name)) || [];

      // Step 2: Check if roles have changed compared to current store state
      const currentRoles = get().roles || [];
      const rolesChanged =
        dbRoles.length !== currentRoles.length ||
        !dbRoles.every((r) => currentRoles.includes(r)) ||
        get().permissions.length === 0;

      // Step 3: If roles changed, rotate the JWT access token so subsequent API calls carry the new claims
      const currentRefreshToken = localStorage.getItem('refresh_token');
      if (rolesChanged && currentRefreshToken) {
        try {
          const { data: refreshData } = await axios.post(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            { refresh_token: currentRefreshToken }
          );

          const newAccessToken = refreshData.data.access_token;
          const newRefreshToken = refreshData.data.refresh_token;

          localStorage.setItem('access_token', newAccessToken);
          localStorage.setItem('refresh_token', newRefreshToken);

          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

          set({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        } catch (refreshErr) {
          console.warn('Silent token refresh on role change failed:', refreshErr);
        }
      }

      // Step 4: Always update store with the fresh DB roles and permissions
      set({
        user,
        roles: dbRoles,
        permissions: dbPermissions,
        isAuthenticated: true,
      });
    } catch {
      // Token invalid or revoked — clear auth
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({
        user: null,
        roles: [],
        permissions: [],
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    } finally {
      isFetchingUser = false;
    }
  },

  /**
   * Check if user has a specific permission.
   * Super admin has all permissions.
   */
  hasPermission: (permission) => {
    const { roles, permissions } = get();
    if (roles.includes('super_admin')) return true;
    return permissions.includes(permission);
  },

  /**
   * Check if user has any of the given roles.
   */
  hasRole: (role) => {
    return get().roles.includes(role);
  },

  /**
   * Clear error state.
   */
  clearError: () => set({ error: null }),

  /**
   * Cancel MFA flow — go back to login.
   */
  cancelMfa: () => set({
    mfaRequired: false,
    mfaPendingCredentials: null,
    error: null,
  }),
}));

export default useAuthStore;
