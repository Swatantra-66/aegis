import { create } from 'zustand';
import api, { getErrorMessage } from '../lib/api';

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
      set({
        isLoading: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },

  /**
   * Login — authenticate with email/password.
   * May return mfa_required: true if user has MFA enabled.
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null, mfaRequired: false });
    try {
      const { data } = await api.post('/auth/login', { email, password });

      if (data.data.mfa_required) {
        set({
          mfaRequired: true,
          mfaPendingCredentials: { email, password },
          isLoading: false,
        });
        return { mfaRequired: true };
      }

      const { user, access_token, refresh_token } = data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      set({
        user,
        roles: user.roles || [],
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
        friendlyError = 'No account found with this email address. Please sign up first.';
      } else if (status === 401 || serverMsg.toLowerCase().includes('invalid') || serverMsg.toLowerCase().includes('incorrect') || serverMsg.toLowerCase().includes('password')) {
        friendlyError = 'Incorrect password. Please try again.';
      } else if (status === 429) {
        friendlyError = 'Too many login attempts. Please wait a moment and try again.';
      } else if (status === 400) {
        friendlyError = 'Invalid email or password format. Please check your input.';
      } else if (!status || status >= 500) {
        friendlyError = 'Unable to reach the server. Please check your connection and try again.';
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

      set({
        user,
        roles: user.roles || [],
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
   * Fetch current user profile — called on app init if token exists.
   */
  fetchUser: async () => {
    try {
      const { data } = await api.get('/users/me');
      const user = data.data.user;

      set({
        user,
        roles: user.roles?.map((r) => r.name) || [],
        permissions: user.permissions?.map((p) => p.name) || [],
        isAuthenticated: true,
      });
    } catch {
      // Token invalid — clear auth
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
