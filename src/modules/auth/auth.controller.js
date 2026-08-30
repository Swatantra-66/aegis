const authService = require('./auth.service');
const apiResponse = require('../../utils/apiResponse');

/**
 * Auth Controller — thin HTTP layer.
 * Validates input (via middleware), calls service, returns standardized response.
 */

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res) => {
  const user = await authService.register(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.created(res, {
    message: 'Registration successful',
    data: { user },
  });
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  const result = await authService.login(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // MFA required — return partial response
  if (result.mfaRequired) {
    return apiResponse.success(res, {
      statusCode: 200,
      message: 'MFA verification required',
      data: { mfa_required: true },
    });
  }

  return apiResponse.success(res, {
    message: 'Login successful',
    data: {
      user: result.user,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      token_type: 'Bearer',
    },
  });
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res) => {
  const { refresh_token } = req.body;
  const tokens = await authService.refresh(refresh_token);

  return apiResponse.success(res, {
    message: 'Token refreshed successfully',
    data: {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
    },
  });
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  const { refresh_token } = req.body;

  await authService.logout(req.user?.jti, refresh_token, {
    userId: req.user?.id,
    userEmail: req.user?.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.success(res, {
    message: 'Logged out successfully',
  });
};

/**
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  const resetToken = await authService.forgotPassword(req.body.email, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // In production, the token would be emailed, not returned
  const data = process.env.NODE_ENV === 'development' ? { reset_token: resetToken } : {};

  return apiResponse.success(res, {
    message: 'If an account with that email exists, a password reset link has been sent',
    data,
  });
};

/**
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  await authService.resetPassword(token, password, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.success(res, {
    message: 'Password reset successfully. Please login with your new password.',
  });
};

/**
 * POST /api/v1/auth/send-verification-email
 */
const sendVerificationEmail = async (req, res) => {
  const verificationToken = await authService.sendVerificationEmail(req.user.id, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  const data =
    process.env.NODE_ENV === 'development' ? { verification_token: verificationToken } : {};

  return apiResponse.success(res, {
    message: 'Verification email has been dispatched. Please check your inbox.',
    data,
  });
};

/**
 * POST /api/v1/auth/verify-email
 */
const verifyEmail = async (req, res) => {
  const { token } = req.body;

  const result = await authService.verifyEmail(token, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.success(res, {
    message: 'Email address has been successfully verified.',
    data: result,
  });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
