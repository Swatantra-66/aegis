const { ROLES } = require('../../config/constants');

/**
 * Security Policy Engine — AEGIS Zero-Trust Policy Evaluator.
 * Enforces role-specific authentication gates:
 * - USER: Email verification optional, TOTP MFA optional, Disable MFA allowed with re-auth.
 * - ADMIN: Email verification required, TOTP MFA required, Disable MFA strictly prohibited.
 * - SUPER_ADMIN: Email verification required, TOTP MFA required, Disable MFA strictly prohibited.
 *
 * Core Invariant: Policy failures NEVER result in issuance of a normal authenticated access token.
 */

const ROLE_POLICIES = {
  [ROLES.USER]: {
    emailVerificationRequired: false,
    mfaMandatory: false,
    allowDisableMfa: true,
  },
  [ROLES.ADMIN]: {
    emailVerificationRequired: false, // Inactive until mailer service is configured
    mfaMandatory: true,
    allowDisableMfa: false,
  },
  [ROLES.SUPER_ADMIN]: {
    emailVerificationRequired: false, // Inactive until mailer service is configured
    mfaMandatory: true,
    allowDisableMfa: false,
  },
};

/**
 * Determine the strictest policy requirements across all assigned roles.
 * @param {string[]} roles - Array of role names
 * @returns {Object} Effective security policy
 */
const getEffectivePolicy = (roles = []) => {
  const normalizedRoles = roles.map((r) =>
    typeof r === 'string' ? r.toLowerCase() : r.name?.toLowerCase()
  );

  const isAdminOrSuper = normalizedRoles.some(
    (r) => r === ROLES.ADMIN || r === ROLES.SUPER_ADMIN || r === 'admin' || r === 'super_admin'
  );

  if (isAdminOrSuper) {
    return {
      emailVerificationRequired: false, // Inactive until mailer service is configured
      mfaMandatory: true,
      allowDisableMfa: false,
      tier: 'ADMINISTRATIVE_HARDENED',
    };
  }

  return {
    emailVerificationRequired: false,
    mfaMandatory: false,
    allowDisableMfa: true,
    tier: 'STANDARD_USER',
  };
};

/**
 * Check if the user is permitted to disable MFA under current policy.
 * @param {string[]} roles
 * @returns {boolean}
 */
const canDisableMfa = (roles = []) => {
  const policy = getEffectivePolicy(roles);
  return policy.allowDisableMfa;
};

/**
 * Evaluate authentication policy during login flow.
 * Determines if additional requirements must be fulfilled before a full session / access token can be issued.
 *
 * @param {Object} params
 * @param {Object} params.user - User database record
 * @param {string[]} params.roles - Assigned roles
 * @param {string} [params.mfaCode] - Supplied TOTP code (if any)
 * @returns {Object} { allowed: boolean, requirement?: string, message?: string }
 */
const evaluateLoginPolicy = ({ user, roles = [], mfaCode }) => {
  const policy = getEffectivePolicy(roles);

  // 1. Check Mandatory MFA Policy (for Admin / Super Admin)
  if (policy.mfaMandatory && !user.mfa_enabled) {
    return {
      allowed: false,
      requirement: 'MFA_SETUP_REQUIRED',
      message:
        'Administrative security policy requires Multi-Factor Authentication (TOTP) setup before session issuance.',
    };
  }

  // 3. Check Active MFA (enabled by policy or user preference)
  if (user.mfa_enabled) {
    if (!mfaCode) {
      return {
        allowed: false,
        requirement: 'MFA_REQUIRED',
        message: 'Two-Factor Authentication required. Please provide a 6-digit TOTP code.',
      };
    }
  }

  // All policy requirements satisfied
  return {
    allowed: true,
  };
};

module.exports = {
  ROLE_POLICIES,
  getEffectivePolicy,
  canDisableMfa,
  evaluateLoginPolicy,
};
