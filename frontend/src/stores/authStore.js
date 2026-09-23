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

const initialAccessToken = localStorage.getItem('access_token') || null;
const initialClaims = initialAccessToken ? parseJwt(initialAccessToken) : {};

if (initialAccessToken) {
  api.defaults.headers.common.Authorization = `Bearer ${initialAccessToken}`;
}

/**
 * Zustand auth store — manages authentication state, user info, roles, and permissions.
 * Persists tokens to localStorage. User data fetched fresh on init.
 */
const useAuthStore = create((set, get) => ({
  // State
  user: null,
  roles: initialClaims.roles || [],
  permissions: initialClaims.permissions || [],
  accessToken: initialAccessToken,
  refreshToken: localStorage.getItem('refresh_token') || null,
  isAuthenticated: !!initialAccessToken,
  isLoading: false,
  error: null,

  // MFA state (for login flow)
  mfaRequired: false,
  mfaSetupRequired: false,
  mfaEnrollmentToken: sessionStorage.getItem('mfa_enrollment_token') || null,
  mfaPendingCredentials: null,

  /**
   * Set user session directly from access and refresh tokens.
   */
  setSession: ({ user, access_token, refresh_token, accessToken, refreshToken }) => {
    const finalAccessToken = access_token || accessToken;
    const finalRefreshToken = refresh_token || refreshToken;

    if (!finalAccessToken || !finalRefreshToken) {
      throw new Error('setSession requires access_token and refresh_token');
    }

    localStorage.setItem('access_token', finalAccessToken);
    localStorage.setItem('refresh_token', finalRefreshToken);
    sessionStorage.removeItem('mfa_enrollment_token');
    api.defaults.headers.common.Authorization = `Bearer ${finalAccessToken}`;

    const claims = parseJwt(finalAccessToken);

    set({
      user,
      roles: claims.roles || user?.roles || [],
      permissions: claims.permissions || [],
      accessToken: finalAccessToken,
      refreshToken: finalRefreshToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      mfaRequired: false,
      mfaSetupRequired: false,
      mfaEnrollmentToken: null,
      mfaPendingCredentials: null,
    });
  },

  /**
   * Register — create new user identity and automatically log in (legacy fallback).
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
   * May return mfa_required: true if user has MFA enabled, or mfa_setup_required: true for admin policy.
   */
  login: async (email, password, remember_me = false) => {
    // 1. Purge any previous session completely before entering authentication or enrollment flows
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('mfa_enrollment_token');
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common.Authorization;

    set({
      user: null,
      roles: [],
      permissions: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      mfaRequired: false,
      mfaSetupRequired: false,
      mfaEnrollmentToken: null,
      mfaPendingCredentials: null,
    });

    try {
      const { data } = await api.post('/auth/login', { email, password, remember_me });

      if (data.data.mfa_setup_required) {
        const msg = data.message || 'Administrative policy requires Multi-Factor Authentication (TOTP) setup before access is granted.';
        const enrollmentToken = data.data.mfa_enrollment_token;

        // Ensure clean state: purge any residual tokens and Axios headers
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common.Authorization;

        if (enrollmentToken) {
          sessionStorage.setItem('mfa_enrollment_token', enrollmentToken);
        }

        set({
          user: null,
          roles: [],
          permissions: [],
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          mfaSetupRequired: true,
          mfaEnrollmentToken: enrollmentToken,
          error: msg,
        });
        return { mfaSetupRequired: true, message: msg, enrollmentToken };
      }

      if (data.data.mfa_required) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common.Authorization;

        set({
          user: null,
          roles: [],
          permissions: [],
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          mfaRequired: true,
          mfaPendingCredentials: { email, password, remember_me },
          isLoading: false,
        });
        return { mfaRequired: true };
      }

      const { user, access_token, refresh_token } = data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      sessionStorage.removeItem('mfa_enrollment_token');
      api.defaults.headers.common.Authorization = `Bearer ${access_token}`;

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
        mfaSetupRequired: false,
        mfaEnrollmentToken: null,
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
      sessionStorage.removeItem('mfa_enrollment_token');

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
        mfaSetupRequired: false,
        mfaEnrollmentToken: null,
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
    sessionStorage.removeItem('mfa_enrollment_token');
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common.Authorization;

    set({
      user: null,
      roles: [],
      permissions: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      mfaRequired: false,
      mfaSetupRequired: false,
      mfaEnrollmentToken: null,
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
        currentRoles.length > 0 &&
        (dbRoles.length !== currentRoles.length ||
          !dbRoles.every((r) => currentRoles.includes(r)));

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
          // Session was revoked on role change or blocked by security policy (e.g. MFA required)
          await get().logout();
          return;
        }
      }

      // Step 4: Always update store with the fresh DB roles and permissions
      set({
        user,
        roles: dbRoles,
        permissions: dbPermissions,
        isAuthenticated: true,
      });
    } catch (err) {
      // Clear auth only if token is definitively invalid/expired/revoked (401)
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('mfa_enrollment_token');
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common.Authorization;

        set({
          user: null,
          roles: [],
          permissions: [],
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          mfaRequired: false,
          mfaSetupRequired: false,
          mfaEnrollmentToken: null,
          mfaPendingCredentials: null,
        });
      }
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
  cancelMfa: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('mfa_enrollment_token');
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common.Authorization;

    set({
      user: null,
      roles: [],
      permissions: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      mfaRequired: false,
      mfaSetupRequired: false,
      mfaEnrollmentToken: null,
      mfaPendingCredentials: null,
      error: null,
    });
  },
}));

export default useAuthStore;
