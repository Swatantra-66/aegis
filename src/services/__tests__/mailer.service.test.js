const { redis } = require('../../config/redis');
const mailerService = require('../mailer.service');

jest.mock('../../config/redis', () => ({
  redis: {
    eval: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

describe('MailerService (Atomic Idempotency Reservation, Recovery & Deduplication)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mailerService.transporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-smtp-message-id' }),
    };
  });

  test('returns cached result immediately when reservation returns ALREADY_SENT', async () => {
    redis.eval.mockResolvedValueOnce([
      'ALREADY_SENT',
      JSON.stringify({ messageId: 'cached-msg-123' }),
    ]);

    const result = await mailerService.sendPasswordResetEmail({
      toEmail: 'user@aegis.iam',
      userName: 'Alice',
      resetUrl: 'https://aegis.iam/reset?token=abc',
      idempotencyKey: 'idem-1',
    });

    expect(result).toEqual({ messageId: 'cached-msg-123' });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('RESERVE_MAIL_IDEMPOTENCY'),
      1,
      'iam:mailer:idempotency:idem-1',
      expect.any(String),
      120,
      expect.any(Number),
      45000
    );
  });

  test('acquires reservation, invokes transport, and finalizes as sent', async () => {
    // 1. Reservation acquired
    redis.eval
      .mockResolvedValueOnce(['ACQUIRED', ''])
      // 2. Finalize as sent
      .mockResolvedValueOnce(1);

    const result = await mailerService.sendPasswordResetEmail({
      toEmail: 'user@aegis.iam',
      userName: 'Alice',
      resetUrl: 'https://aegis.iam/reset?token=abc',
      idempotencyKey: 'idem-new',
    });

    expect(result).toBeDefined();
    expect(result.messageId).toBeDefined();

    // Verify finalize call
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('FINALIZE_MAIL_IDEMPOTENCY'),
      1,
      'iam:mailer:idempotency:idem-new',
      expect.any(String),
      expect.any(String),
      604800,
      expect.any(Number)
    );
  });

  test('recovers stale pending reservation from crashed worker and dispatches successfully', async () => {
    // Stale reservation recovered
    redis.eval.mockResolvedValueOnce(['RECOVERED', '']).mockResolvedValueOnce(1);

    const result = await mailerService.sendPasswordResetEmail({
      toEmail: 'user@aegis.iam',
      userName: 'Alice',
      resetUrl: 'https://aegis.iam/reset?token=abc',
      idempotencyKey: 'idem-crashed',
    });

    expect(result).toBeDefined();
    expect(redis.eval).toHaveBeenCalledTimes(2);
  });

  test('releases pending reservation on transport failure so retries can proceed', async () => {
    redis.eval
      .mockResolvedValueOnce(['ACQUIRED', '']) // Reservation acquired
      .mockResolvedValueOnce(1); // Release call

    // Force transport failure by mocking nodemailer failure
    const originalTransporter = mailerService.transporter;
    mailerService.transporter = {
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP connection refused')),
    };

    try {
      await expect(
        mailerService.sendPasswordResetEmail({
          toEmail: 'user@aegis.iam',
          userName: 'Alice',
          resetUrl: 'https://aegis.iam/reset?token=abc',
          idempotencyKey: 'idem-fail',
        })
      ).rejects.toThrow('SMTP connection refused');

      // Verify RELEASE_MAIL_IDEMPOTENCY_LUA was called
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('RELEASE_MAIL_IDEMPOTENCY'),
        1,
        'iam:mailer:idempotency:idem-fail',
        expect.any(String)
      );
    } finally {
      mailerService.transporter = originalTransporter;
    }
  });
});
