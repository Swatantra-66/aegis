const { validate, register, login, refreshToken, forgotPassword, resetPassword } = require('../auth.validator');

describe('Auth Validators', () => {
  describe('register schema', () => {
    test('should accept valid registration data', () => {
      const { error } = register.validate({
        email: 'user@example.com',
        password: 'StrongP@ss1',
        first_name: 'John',
        last_name: 'Doe',
      });
      expect(error).toBeUndefined();
    });

    test('should reject invalid email', () => {
      const { error } = register.validate({
        email: 'not-an-email',
        password: 'StrongP@ss1',
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });

    test('should reject weak password (no uppercase)', () => {
      const { error } = register.validate({
        email: 'user@example.com',
        password: 'weakpass1!',
      });
      expect(error).toBeDefined();
    });

    test('should reject weak password (no special char)', () => {
      const { error } = register.validate({
        email: 'user@example.com',
        password: 'StrongPass1',
      });
      expect(error).toBeDefined();
    });

    test('should reject short password', () => {
      const { error } = register.validate({
        email: 'user@example.com',
        password: 'S@1a',
      });
      expect(error).toBeDefined();
    });

    test('should lowercase and trim email', () => {
      const { value } = register.validate({
        email: '  User@EXAMPLE.com  ',
        password: 'StrongP@ss1',
      });
      expect(value.email).toBe('user@example.com');
    });

    test('should allow optional first_name and last_name', () => {
      const { error } = register.validate({
        email: 'user@example.com',
        password: 'StrongP@ss1',
      });
      expect(error).toBeUndefined();
    });
  });

  describe('login schema', () => {
    test('should accept valid login data', () => {
      const { error } = login.validate({
        email: 'user@example.com',
        password: 'anypassword',
      });
      expect(error).toBeUndefined();
    });

    test('should accept login with MFA code', () => {
      const { error } = login.validate({
        email: 'user@example.com',
        password: 'anypassword',
        mfa_code: '123456',
      });
      expect(error).toBeUndefined();
    });

    test('should reject non-numeric MFA code', () => {
      const { error } = login.validate({
        email: 'user@example.com',
        password: 'anypassword',
        mfa_code: 'abcdef',
      });
      expect(error).toBeDefined();
    });

    test('should reject MFA code with wrong length', () => {
      const { error } = login.validate({
        email: 'user@example.com',
        password: 'anypassword',
        mfa_code: '12345',
      });
      expect(error).toBeDefined();
    });
  });

  describe('refreshToken schema', () => {
    test('should accept valid UUID', () => {
      const { error } = refreshToken.validate({
        refresh_token: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(error).toBeUndefined();
    });

    test('should reject non-UUID', () => {
      const { error } = refreshToken.validate({
        refresh_token: 'not-a-uuid',
      });
      expect(error).toBeDefined();
    });
  });

  describe('validate middleware', () => {
    test('should call next() on valid input', () => {
      const middleware = validate(login);
      const req = { body: { email: 'user@example.com', password: 'pass123' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.email).toBe('user@example.com');
    });

    test('should call next(error) on invalid input', () => {
      const middleware = validate(login);
      const req = { body: { email: 'invalid' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const err = next.mock.calls[0][0];
      expect(err.isJoi).toBe(true);
    });

    test('should strip unknown fields', () => {
      const middleware = validate(login);
      const req = { body: { email: 'user@example.com', password: 'pass', hack: 'injection' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.hack).toBeUndefined();
    });
  });
});
