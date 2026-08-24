const AppError = require('../../../utils/AppError');

// Mock dependencies before requiring the modules
jest.mock('../../../middleware/authenticate', () => {
  return jest.fn((req, res, next) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['user:read', 'mfa:manage'],
      jti: 'test-jti',
    };
    next();
  });
});

const authorize = require('../../../middleware/authorize');

describe('Authorize Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        email: 'user@example.com',
        roles: ['admin'],
        permissions: ['user:read', 'user:create', 'role:read'],
      },
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('AND mode (default)', () => {
    test('should allow when user has all required permissions', () => {
      const middleware = authorize('user:read', 'user:create');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should deny when user is missing a permission', () => {
      const middleware = authorize('user:read', 'user:delete');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const err = mockNext.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should deny when user has no permissions', () => {
      mockReq.user.permissions = [];
      const middleware = authorize('user:read');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('OR mode (authorize.any)', () => {
    test('should allow when user has any one of the required permissions', () => {
      const middleware = authorize.any('user:delete', 'user:read');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should deny when user has none of the required permissions', () => {
      const middleware = authorize.any('audit:read', 'audit:verify');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('No user attached', () => {
    test('should return 401 when req.user is missing', () => {
      mockReq.user = undefined;
      const middleware = authorize('user:read');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const err = mockNext.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });
  });
});
