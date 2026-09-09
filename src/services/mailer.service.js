const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const config = require('../config/index');
const logger = require('../utils/logger');

/**
 * Mailer Service — Dispatches cryptographically secured transactional emails.
 */
class MailerService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = config.email;

    if (smtpHost && smtpUser) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort) || 587,
        secure: Boolean(smtpSecure),
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });

      logger.info(`SMTP Mailer initialized successfully for host [${smtpHost}:${smtpPort}]`);
    } else {
      if (config.env === 'production') {
        logger.error(
          'CRITICAL: SMTP credentials not configured in production environment. Mail delivery will fail.'
        );
      } else {
        logger.warn(
          'SMTP credentials not configured. Mailer running in development/fallback mode.'
        );
      }
    }
  }

  /**
   * Escape user-supplied strings to prevent HTML injection in email bodies.
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    if (!str) {
      return '';
    }
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Send verification link email to user.
   * @param {Object} options
   * @param {string} options.toEmail
   * @param {string} [options.userName]
   * @param {string} options.verificationUrl
   * @returns {Promise<Object>}
   */
  async sendVerificationEmail({ toEmail, userName, verificationUrl }) {
    const safeName = this.escapeHtml(userName || 'there');
    const safeUrl = this.escapeHtml(verificationUrl);

    const subject = 'Verify your email address — AEGIS';

    const logoCandidatePath = path.resolve(__dirname, '../assets/aegis-logo.png');
    const fallbackLogoPath = path.resolve(__dirname, '../../frontend/public/aegis-logo-new.png');
    const logoPath = fs.existsSync(logoCandidatePath) ? logoCandidatePath : fallbackLogoPath;
    const hasLogo = fs.existsSync(logoPath);
    const attachments = hasLogo
      ? [
          {
            filename: 'aegis-logo.png',
            path: logoPath,
            cid: 'aegislogo',
          },
        ]
      : [];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address — Aegis</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #ffffff;">
  <!-- Hidden Preheader -->
  <div style="display: none; font-size: 1px; color: #000000; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    Please verify your email address to complete your Aegis account setup.
  </div>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #0d0d0d; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 40px 36px; text-align: left;">
          <!-- Real Brand Header: Icon + AEGIS -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  ${
                    hasLogo
                      ? `<td valign="middle" style="padding-right: 12px;">
                          <img src="cid:aegislogo" alt="Aegis" width="30" height="30" style="display: block; width: 30px; height: 30px; border: 0;" />
                        </td>`
                      : ''
                  }
                  <td valign="middle">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 800; letter-spacing: 0.08em; color: #ffffff; line-height: 1;">AEGIS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-bottom: 20px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Verify your email address
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-bottom: 28px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #d4d4d8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Hi ${safeName},
              </p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #a1a1aa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Please click the button below to confirm your email address and activate your Aegis account:
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 32px; background-color: #ffffff; color: #000000; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; letter-spacing: 0.01em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Direct Link & Expiry Notice -->
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                This verification link will expire in 24 hours.
              </p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #71717a; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <p style="margin: 0; font-size: 12px; color: #52525b; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Button not working? Copy and paste this link into your browser:<br />
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #a1a1aa; text-decoration: underline; word-break: break-all;">${safeUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: left;">
              <p style="margin: 0; font-size: 12px; color: #3f3f46; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                &copy; 2026 Aegis Security Inc. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
AEGIS — Email Verification

Hello ${safeName},

Please confirm your email address for your Aegis account (${toEmail}) by visiting:
${verificationUrl}

This link is valid for 24 hours and can only be used once.

If you did not request this, you can safely ignore this message.
    `.trim();

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: config.email.from,
          to: toEmail,
          subject,
          text,
          html,
          attachments,
        });
        logger.info(`Verification email dispatched to [${toEmail}] messageId: ${info.messageId}`);
        return info;
      } catch (err) {
        logger.error(`Failed to send verification email via SMTP: ${err.message}`);
        throw err;
      }
    } else {
      // Disable fallback outside development and test
      if (config.env !== 'development' && config.env !== 'test') {
        throw new Error('SMTP credentials are not configured for production environment.');
      }

      // Development/Test Fallback: Log clearly
      logger.warn(`[DEV EMAIL FALLBACK] Verification link for ${toEmail}: ${verificationUrl}`);
      return { messageId: 'dev-fallback-message-id' };
    }
  }
}

module.exports = new MailerService();
