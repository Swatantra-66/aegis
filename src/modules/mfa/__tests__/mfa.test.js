const catchAsync = require('../../../middleware/asyncWrapper');

describe('catchAsync Middleware', () => {
  test('should call the async function and resolve', async () => {
    const handler = jest.fn().mockResolvedValue('result');
    const wrapped = catchAsync(handler);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  test('should catch rejected promises and pass error to next()', async () => {
    const error = new Error('Async error');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = catchAsync(handler);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('should catch thrown errors and pass to next()', async () => {
    const handler = jest.fn().mockImplementation(async () => {
      throw new Error('Thrown error');
    });
    const wrapped = catchAsync(handler);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Thrown error');
  });
});
