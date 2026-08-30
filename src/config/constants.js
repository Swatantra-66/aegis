/**
 * Application-wide constants.
 * Centralized here so changes propagate everywhere without code edits.
 */
const CONSTANTS = {
  // ── Token Lifetimes ────────────────────────────────
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: 1,
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: 24,

  // ── Rate Limiting (per-route overrides) ────────────
  RATE_LIMITS: {
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
    },
    PASSWORD_RESET: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 attempts per window
    },
    API_AUTHENTICATED: {
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
    },
    API_ADMIN: {
      windowMs: 60 * 1000, // 1 minute
      max: 200, // 200 requests per minute
    },
  },

  // ── Account Security ───────────────────────────────
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION_MINUTES: 30,
  PASSWORD_MIN_LENGTH: 8,

  // ── RBAC Default Roles ─────────────────────────────
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    USER: 'user',
  },

  // ── Audit Actions ──────────────────────────────────
  AUDIT_ACTIONS: {
    USER_REGISTERED: 'USER_REGISTERED',
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
    USER_LOGOUT: 'USER_LOGOUT',
    USER_UPDATED: 'USER_UPDATED',
    USER_DELETED: 'USER_DELETED',
    USER_LOCKED: 'USER_LOCKED',
    USER_UNLOCKED: 'USER_UNLOCKED',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
    PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
    PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
    EMAIL_VERIFICATION_REQUESTED: 'EMAIL_VERIFICATION_REQUESTED',
    EMAIL_VERIFIED: 'EMAIL_VERIFIED',
    MFA_ENABLED: 'MFA_ENABLED',
    MFA_DISABLED: 'MFA_DISABLED',
    MFA_VERIFIED: 'MFA_VERIFIED',
    ROLE_CREATED: 'ROLE_CREATED',
    ROLE_UPDATED: 'ROLE_UPDATED',
    ROLE_DELETED: 'ROLE_DELETED',
    ROLE_ASSIGNED: 'ROLE_ASSIGNED',
    ROLE_REMOVED: 'ROLE_REMOVED',
    PERMISSION_ASSIGNED: 'PERMISSION_ASSIGNED',
    PERMISSION_REMOVED: 'PERMISSION_REMOVED',
    TOKEN_REVOKED: 'TOKEN_REVOKED',
    TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  },

  // ── Redis Key Prefixes ─────────────────────────────
  REDIS_PREFIXES: {
    TOKEN_BLACKLIST: 'bl:',
    RATE_LIMIT: 'rl:',
    SESSION: 'sess:',
  },

  // ── Pagination Defaults ────────────────────────────
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
};

// Freeze to prevent accidental mutation
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.RATE_LIMITS);
Object.freeze(CONSTANTS.ROLES);
Object.freeze(CONSTANTS.AUDIT_ACTIONS);
Object.freeze(CONSTANTS.REDIS_PREFIXES);
Object.freeze(CONSTANTS.PAGINATION);

module.exports = CONSTANTS;
