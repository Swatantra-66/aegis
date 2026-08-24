const AppError = require('../../../utils/AppError');
const errorHandler = require('../../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      originalUrl: '/api/v1/test',
      method: 'POST',
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test('should handle AppError correctly', () => {
    const err = AppError.notFound('User not found', 'USER_NOT_FOUND');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      })
    );
  });

  test('should handle Joi validation errors', () => {
    const err = new Error('Validation failed');
    err.isJoi = true;
    err.details = [
      { message: '"email" is required' },
      { message: '"password" must be at least 8 characters' },
    ];

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    const response = mockRes.json.mock.calls[0][0];
    expect(response.code).toBe('VALIDATION_ERROR');
    expect(response.errors).toHaveLength(2);
  });

  test('should handle PostgreSQL unique constraint violation', () => {
    const err = new Error('duplicate key value');
    err.code = '23505';

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json.mock.calls[0][0].code).toBe('DUPLICATE_ENTRY');
  });

  test('should handle JWT errors', () => {
    const err = new Error('jwt malformed');
    err.name = 'JsonWebTokenError';

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json.mock.calls[0][0].code).toBe('INVALID_TOKEN');
  });

  test('should handle token expired errors', () => {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json.mock.calls[0][0].code).toBe('TOKEN_EXPIRED');
  });

  test('should handle unknown errors with 500', () => {
    const err = new Error('Something unexpected');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
