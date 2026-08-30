const AppError = require('../utils/AppError');

/**
 * Authorization middleware factory.
 * Checks if the authenticated user has the required permissions.
 *
 * @param {...string} requiredPermissions - One or more permission strings (e.g., 'user:read', 'role:create')
 * @param {Object} [options]
 * @param {string} [options.mode='AND'] - 'AND' = all required, 'OR' = any one required
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.get('/users', authenticate, authorize('user:read'), controller.list);
 *   router.delete('/users/:id', authenticate, authorize('user:delete', 'admin:manage'), controller.delete);
 *   router.get('/reports', authenticate, authorize.any('audit:read', 'report:read'), controller.reports);
 */
const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
    }

    const userPermissions = req.user.permissions || [];

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAllPermissions) {
      return next(
        AppError.forbidden(
          'You do not have permission to perform this action',
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
};

/**
 * OR-mode authorization: user needs ANY ONE of the listed permissions.
 */
authorize.any = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
    }

    const userPermissions = req.user.permissions || [];

    const hasAnyPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));

    if (!hasAnyPermission) {
      return next(
        AppError.forbidden(
          'You do not have permission to perform this action',
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
};

/**
 * Self-or-Permission authorization: allowed if user is accessing their own resource
 * OR has the required administrative permission.
 *
 * @param {string} permission - Administrative permission fallback (e.g. 'user:update')
 * @param {string} [paramName='id'] - URL param name holding target user's UUID
 */
authorize.selfOr = (permission, paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
    }

    // If accessing own resource, grant self-service access
    if (req.params && req.params[paramName] === req.user.id) {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    if (userPermissions.includes(permission)) {
      return next();
    }

    return next(
      AppError.forbidden(
        'You do not have permission to perform this action on this resource',
        'INSUFFICIENT_PERMISSIONS'
      )
    );
  };
};

module.exports = authorize;
