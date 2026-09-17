const tokenService = require('../modules/tokens/tokens.service');
const tokenBlacklist = require('../modules/tokens/tokens.blacklist');
const AppError = require('../utils/AppError');

/**
 * MFA Enrollment Authentication Middleware.
 * Permissively authenticates either:
 * 1) A full Bearer access token (for regular users setting up MFA from within their profile).
 * 2) A scoped MFA Enrollment Token (scope: 'mfa:enroll_only') issued during login when an
 *    Admin-promoted user requires MFA setup before receiving a full session.
 */
const authenticateMfaEnrollment = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(
        'Authentication token is required for MFA setup',
        'AUTH_TOKEN_MISSING'
      );
    }

    const token = authHeader.split(' ')[1];

    // Try verifying as an MFA Enrollment Token first
    try {
      const decodedEnrollment = tokenService.verifyMfaEnrollmentToken(token);
      if (decodedEnrollment && decodedEnrollment.scope === 'mfa:enroll_only') {
        const isBlacklisted = await tokenBlacklist.isBlacklisted(decodedEnrollment.jti);
        if (isBlacklisted) {
          throw AppError.unauthorized('Enrollment token has been revoked', 'AUTH_TOKEN_REVOKED');
        }

        req.user = {
          id: decodedEnrollment.sub,
          email: decodedEnrollment.email,
          isEnrollmentOnly: true,
          scope: decodedEnrollment.scope,
          jti: decodedEnrollment.jti,
          exp: decodedEnrollment.exp,
          token,
        };
        return next();
      }
    } catch (enrollErr) {
      // If it failed because it's expired or blacklisted, don't fallback to regular access token if it had the enrollment scope
      if (enrollErr.name === 'TokenExpiredError') {
        throw AppError.unauthorized(
          'MFA enrollment token has expired. Please sign in again.',
          'AUTH_ENROLLMENT_TOKEN_EXPIRED'
        );
      }
      // If not an enrollment token, continue to check if it's a standard access token
    }

    // Fallback: Verify as a regular access token
    let decoded;
    try {
      decoded = tokenService.verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Access token has expired', 'AUTH_TOKEN_EXPIRED');
      }
      throw AppError.unauthorized('Invalid authentication token', 'AUTH_TOKEN_INVALID');
    }

    // Check blacklist
    const blacklisted = await tokenBlacklist.isBlacklisted(decoded.jti);
    if (blacklisted) {
      throw AppError.unauthorized('Token has been revoked', 'AUTH_TOKEN_REVOKED');
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      isEnrollmentOnly: false,
      jti: decoded.jti,
      exp: decoded.exp,
      token,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticateMfaEnrollment;
