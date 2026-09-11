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
    this.useGmailApi = false;
    this.cachedAccessToken = null;
    this.tokenExpiryTime = 0;
    this.init();
  }

  init() {
    const { gmailClientId, gmailClientSecret, gmailRefreshToken, smtpHost, smtpUser, smtpPass } =
      config.email;

    if (gmailClientId && gmailClientSecret && gmailRefreshToken) {
      this.useGmailApi = true;
      logger.info(
        'Google Gmail REST API initialized successfully (HTTPS Port 443 — DigitalOcean Compatible)'
      );
    } else if (smtpHost && smtpUser) {
      this.useGmailApi = false;
      const isGmail = smtpHost.toLowerCase().includes('gmail');

      const transportConfig = isGmail
        ? {
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          }
        : {
            host: smtpHost,
            port: Number(config.email.smtpPort) || 587,
            secure: Boolean(config.email.smtpSecure),
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          };

      this.transporter = nodemailer.createTransport(transportConfig);

      logger.info(
        `SMTP Mailer initialized successfully for ${isGmail ? 'Gmail Service' : `host [${smtpHost}:${config.email.smtpPort}]`}`
      );
    } else {
      if (config.env === 'production') {
        logger.error(
          'CRITICAL: Email credentials not configured in production environment. Mail delivery will fail.'
        );
      } else {
        logger.warn(
          'Email credentials not configured. Mailer running in development/fallback mode.'
        );
      }
    }
  }

  /**
   * Acquire a fresh OAuth2 access token for Google Gmail REST API.
   * Caches token in memory until expiration.
   * @returns {Promise<string>}
   */
  async getGmailAccessToken() {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiryTime) {
      return this.cachedAccessToken;
    }

    const { gmailClientId, gmailClientSecret, gmailRefreshToken } = config.email;
    const bodyParams = new URLSearchParams({
      client_id: gmailClientId,
      client_secret: gmailClientSecret,
      refresh_token: gmailRefreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`Google OAuth token refresh failed [${response.status}]: ${errText}`);
      throw new Error(`Google OAuth token refresh failed [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    this.cachedAccessToken = data.access_token;
    // Buffer expiration by 300 seconds (5 minutes)
    this.tokenExpiryTime = Date.now() + Math.max(0, (data.expires_in - 300) * 1000);
    return this.cachedAccessToken;
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
    const plainName = userName || 'there';
    const safeUrl = this.escapeHtml(verificationUrl);

    const subject = 'Verify your email address — AEGIS';
    const attachments = [];
    const logoUrl = this._getControlledLogoUrl();

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
          <!-- Real Brand Header: Controlled Logo + Authoritative AEGIS Typography -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle" style="padding-right: 12px;">
                    <img src="${logoUrl}" alt="Aegis" width="28" height="28" style="display: block; width: 28px; height: 28px; border: 0;" />
                  </td>
                  <td valign="middle">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 21px; font-weight: 800; letter-spacing: 0.16em; color: #ffffff; line-height: 1; text-transform: uppercase; display: inline-block;">AEGIS</span>
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

Hello ${plainName},

Please confirm your email address for your Aegis account (${toEmail}) by visiting:
${verificationUrl}

This link is valid for 24 hours and can only be used once.

If you did not request this, you can safely ignore this message.
    `.trim();

    return this._dispatchMail({
      toEmail,
      subject,
      text,
      html,
      attachments,
      logLabel: 'Verification',
    });
  }

  /**
   * Send notification to user that an account already exists with their email.
   * Prevents email enumeration while informing the legitimate owner.
   * @param {Object} options
   * @param {string} options.toEmail
   * @param {string} [options.userName]
   * @param {string} options.loginUrl
   * @param {string} options.resetUrl
   * @returns {Promise<Object>}
   */
  async sendAccountExistsEmail({ toEmail, userName, loginUrl, resetUrl }) {
    const safeName = this.escapeHtml(userName || 'there');
    const plainName = userName || 'there';
    const safeToEmail = this.escapeHtml(toEmail);
    const safeLoginUrl = this.escapeHtml(loginUrl);
    const safeResetUrl = this.escapeHtml(resetUrl);

    const subject = 'Security Notice: Account already registered — AEGIS';
    const attachments = [];
    const logoUrl = this._getControlledLogoUrl();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Notice</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; min-height: 100vh; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #0c0c0e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 36px 32px;">
          <tr>
            <td style="padding-bottom: 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle" style="padding-right: 12px;">
                    <img src="${logoUrl}" alt="Aegis" width="26" height="26" style="display: block; width: 26px; height: 26px; border: 0;" />
                  </td>
                  <td valign="middle">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 0.16em; color: #ffffff; line-height: 1; text-transform: uppercase; display: inline-block;">AEGIS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                Account already registered
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; color: #d4d4d8; font-size: 14px; line-height: 1.6;">
              <p style="margin: 0 0 12px 0;">Hi ${safeName},</p>
              <p style="margin: 0 0 12px 0;">Someone recently entered your email address (<strong>${safeToEmail}</strong>) on the Aegis sign-up page.</p>
              <p style="margin: 0;">If you already have an account with us, you can sign in directly or reset your password if you have forgotten it:</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <a href="${safeLoginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 28px; background-color: #ffffff; color: #000000; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 6px;">
                      Sign In to AEGIS
                    </a>
                  </td>
                  <td style="padding-left: 12px;">
                    <a href="${safeResetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 20px; background-color: rgba(255, 255, 255, 0.08); color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; color: #71717a; line-height: 1.5;">
              <p style="margin: 0;">If you didn't initiate this request, you can safely ignore this email. Your account remains fully secure.</p>
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
AEGIS — Security Notice: Account Already Registered

Hi ${plainName},

Someone recently entered your email address (${toEmail}) on the Aegis sign-up page.
If you already have an account, sign in at: ${loginUrl}
If you forgot your password, reset it at: ${resetUrl}

If you didn't initiate this request, you can safely ignore this email.
    `.trim();

    return this._dispatchMail({
      toEmail,
      subject,
      text,
      html,
      attachments,
      logLabel: 'Account Exists',
    });
  }

  /**
   * Internal transport dispatcher for Gmail REST API, SMTP, or Dev Fallback.
   * @private
   */
  async _dispatchMail({ toEmail, subject, text, html, attachments, logLabel = 'Email' }) {
    if (this.useGmailApi) {
      try {
        const streamMailer = nodemailer.createTransport({
          streamTransport: true,
          newline: 'windows',
        });

        const fromHeader = this._formatFromHeader();

        const compiled = await streamMailer.sendMail({
          from: fromHeader,
          to: toEmail,
          subject,
          text,
          html,
          attachments,
        });

        const chunks = [];
        for await (const chunk of compiled.message) {
          chunks.push(chunk);
        }
        const rfc2822Buffer = Buffer.concat(chunks);
        const base64UrlMessage = rfc2822Buffer
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const accessToken = await this.getGmailAccessToken();
        const sendResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: base64UrlMessage }),
          }
        );

        if (!sendResponse.ok) {
          const errText = await sendResponse.text();
          logger.error(`Gmail REST API send failed [${sendResponse.status}]: ${errText}`);
          throw new Error(`Gmail REST API send failed [${sendResponse.status}]: ${errText}`);
        }

        const result = await sendResponse.json();
        logger.info(
          `${logLabel} email dispatched via Gmail REST API to [${toEmail}] messageId: ${result.id}`
        );
        return { messageId: result.id };
      } catch (err) {
        logger.error(
          `Failed to send ${logLabel.toLowerCase()} email via Gmail REST API: ${err.message}`
        );
        throw err;
      }
    } else if (this.transporter) {
      try {
        const fromHeader = this._formatFromHeader();
        const info = await this.transporter.sendMail({
          from: fromHeader,
          to: toEmail,
          subject,
          text,
          html,
          attachments,
        });
        logger.info(`${logLabel} email dispatched to [${toEmail}] messageId: ${info.messageId}`);
        return info;
      } catch (err) {
        logger.error(`Failed to send ${logLabel.toLowerCase()} email via SMTP: ${err.message}`);
        throw err;
      }
    } else {
      if (config.env === 'development' || config.env === 'test') {
        logger.warn(`[DEV EMAIL FALLBACK] ${logLabel} email simulated for ${toEmail}`);
        return { messageId: 'dev-fallback-message-id' };
      }

      throw new Error('Email transport is not configured for this environment');
    }
  }

  /**
   * Returns the brand logo URL served from the controlled domain.
   * Avoids third-party CDN tracking / IP leakage.
   * @private
   */
  _getControlledLogoUrl() {
    const controlledOrigin =
      config.frontendUrl && !config.frontendUrl.includes('localhost')
        ? config.frontendUrl.replace(/\/+$/, '')
        : 'https://aegis.swatantracodes.in';
    return `${controlledOrigin}/aegis-logo-new.png`;
  }

  /**
   * Formats from address to guarantee the sender display label is strictly "AEGIS Security".
   * @private
   */
  _formatFromHeader() {
    const rawFrom = config.email.from || '';
    const emailMatch = rawFrom.match(/<([^>]+)>/);
    const emailAddress = emailMatch ? emailMatch[1] : rawFrom || 'aegisiamsecurity@gmail.com';
    return `"AEGIS Security" <${emailAddress}>`;
  }
}

module.exports = new MailerService();
