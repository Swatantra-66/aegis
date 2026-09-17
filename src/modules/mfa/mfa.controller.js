const mfaService = require('./mfa.service');
const apiResponse = require('../../utils/apiResponse');

const setup = async (req, res) => {
  const result = await mfaService.setup(req.user.id, {
    isEnrollmentOnly: req.user.isEnrollmentOnly,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.success(res, {
    message: 'MFA setup initiated. Scan the QR code with your authenticator app.',
    data: {
      secret: result.secret,
      otpauth_url: result.otpauthUrl,
      backup_codes: result.backupCodes,
    },
  });
};

const verify = async (req, res) => {
  const result = await mfaService.verify(req.user.id, req.body.code, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    isEnrollmentOnly: req.user.isEnrollmentOnly,
    jti: req.user.jti,
    exp: req.user.exp,
  });

  return apiResponse.success(res, {
    message: 'MFA enabled successfully',
    data: result.tokens
      ? {
          access_token: result.tokens.accessToken,
          refresh_token: result.tokens.refreshToken,
          tokens: result.tokens,
          user: result.user,
        }
      : undefined,
  });
};

const getStatus = async (req, res) => {
  const result = await mfaService.getStatus(req.user.id, {
    isEnrollmentOnly: req.user.isEnrollmentOnly,
  });

  return apiResponse.success(res, {
    data: result,
  });
};

const validate = async (req, res) => {
  await mfaService.validate(req.body.user_id, req.body.code);

  return apiResponse.success(res, {
    message: 'MFA code verified',
  });
};

const disable = async (req, res) => {
  await mfaService.disable(req.user.id, req.body.code, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.success(res, {
    message: 'MFA disabled successfully',
  });
};

const requestMfaReset = async (req, res) => {
  const result = await mfaService.requestMfaReset({
    email: req.body.email,
    reqMeta: {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  return apiResponse.success(res, result);
};

module.exports = {
  setup,
  verify,
  validate,
  disable,
  requestMfaReset,
  getStatus,
};
