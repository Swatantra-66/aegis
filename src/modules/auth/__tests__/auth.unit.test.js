const AppError = require('../../../utils/AppError');

describe('AppError', () => {
  test('should create error with default values', () => {
    const err = new AppError('Something went wrong');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err.stack).toBeDefined();
  });

  test('should create error with custom values', () => {
    const err = new AppError('Not found', 404, {
      code: 'USER_NOT_FOUND',
      isOperational: true,
      errors: ['User with ID xyz not found'],
    });

    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('USER_NOT_FOUND');
    expect(err.errors).toEqual(['User with ID xyz not found']);
  });

  describe('Factory methods', () => {
    test('badRequest() creates 400 error', () => {
      const err = AppError.badRequest('Invalid input', 'VALIDATION_FAILED');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_FAILED');
    });

    test('unauthorized() creates 401 error', () => {
      const err = AppError.unauthorized();
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Unauthorized');
    });

    test('forbidden() creates 403 error', () => {
      const err = AppError.forbidden();
      expect(err.statusCode).toBe(403);
    });

    test('notFound() creates 404 error', () => {
      const err = AppError.notFound('User not found');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('User not found');
    });

    test('conflict() creates 409 error', () => {
      const err = AppError.conflict('Email already exists');
      expect(err.statusCode).toBe(409);
    });

    test('tooManyRequests() creates 429 error', () => {
      const err = AppError.tooManyRequests();
      expect(err.statusCode).toBe(429);
    });

    test('internal() creates 500 error with isOperational=false', () => {
      const err = AppError.internal();
      expect(err.statusCode).toBe(500);
      expect(err.isOperational).toBe(false);
    });
  });
});
