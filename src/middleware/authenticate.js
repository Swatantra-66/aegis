const tokenService = require('../modules/tokens/tokens.service');
const tokenBlacklist = require('../modules/tokens/tokens.blacklist');
const AppError = require('../utils/AppError');

/**
 * Authentication middleware.
 * Extracts Bearer token → verifies JWT → checks blacklist → attaches req.user.
 *
 * On failure, returns 401 with a specific error code for client-side handling.
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(
        'Access token is required',
        'AUTH_TOKEN_MISSING'
      );
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify JWT signature and expiry
    let decoded;
    try {
      decoded = tokenService.verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized(
          'Access token has expired',
          'AUTH_TOKEN_EXPIRED'
        );
      }
      throw AppError.unauthorized(
        'Invalid access token',
        'AUTH_TOKEN_INVALID'
      );
    }

    // 3. Check if token is blacklisted
    const blacklisted = await tokenBlacklist.isBlacklisted(decoded.jti);
    if (blacklisted) {
      throw AppError.unauthorized(
        'Token has been revoked',
        'AUTH_TOKEN_REVOKED'
      );
    }

    // 4. Attach user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      jti: decoded.jti,
      token, // Keep raw token for logout blacklisting
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticate;
