const mfaService = require('./mfa.service');
const apiResponse = require('../../utils/apiResponse');

const setup = async (req, res) => {
  const result = await mfaService.setup(req.user.id);

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
  await mfaService.verify(req.user.id, req.body.code, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return apiResponse.success(res, {
    message: 'MFA enabled successfully',
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

module.exports = {
  setup,
  verify,
  validate,
  disable,
};
