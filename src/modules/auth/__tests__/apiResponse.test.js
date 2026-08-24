const apiResponse = require('../../../utils/apiResponse');

describe('API Response Formatter', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('success()', () => {
    test('should return default success response', () => {
      apiResponse.success(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        statusCode: 200,
        message: 'Success',
        data: null,
      });
    });

    test('should return custom success response', () => {
      apiResponse.success(mockRes, {
        statusCode: 200,
        message: 'Users found',
        data: { users: [] },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        statusCode: 200,
        message: 'Users found',
        data: { users: [] },
      });
    });

    test('should include meta when provided', () => {
      apiResponse.success(mockRes, {
        data: [],
        meta: { page: 1, total: 50 },
      });

      const response = mockRes.json.mock.calls[0][0];
      expect(response.meta).toEqual({ page: 1, total: 50 });
    });
  });

  describe('created()', () => {
    test('should return 201 response', () => {
      apiResponse.created(mockRes, {
        data: { id: 'uuid-123' },
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json.mock.calls[0][0].message).toBe('Created successfully');
    });
  });

  describe('error()', () => {
    test('should return error response', () => {
      apiResponse.error(mockRes, {
        statusCode: 400,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: ['Email is required'],
      });

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: ['Email is required'],
      });
    });

    test('should not include errors array when empty', () => {
      apiResponse.error(mockRes, {
        statusCode: 500,
        message: 'Internal error',
      });

      const response = mockRes.json.mock.calls[0][0];
      expect(response.errors).toBeUndefined();
    });
  });

  describe('paginated()', () => {
    test('should return paginated response with meta', () => {
      apiResponse.paginated(mockRes, {
        data: [{ id: 1 }, { id: 2 }],
        page: 1,
        limit: 20,
        total: 50,
      });

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.meta).toEqual({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });
  });
});
